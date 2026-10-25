using LifeTodo.Api.Data;
using LifeTodo.Api.Endpoints;
using LifeTodo.Api.Hubs;
using LifeTodo.Api.Services;
using LifeTodo.Db;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// OpenTelemetry, health checks (/health, /alive), service discovery, resilient HTTP.
builder.AddServiceDefaults();

var databasePath = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "data", "lifetodo.db"));
Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
var connectionString = builder.Configuration.GetConnectionString("lifetodo")
    ?? $"Data Source={databasePath}";

builder.Services.AddDbContext<LifeTodoDbContext>(options => options.UseSqlite(connectionString));

builder.Services.AddSingleton<RecurrenceEngine>();
builder.Services.AddScoped<StatsService>();
builder.Services.AddHostedService<ReminderBackgroundService>();
builder.Services.AddSignalR();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .SetIsOriginAllowed(origin =>
        Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.Host is "localhost" or "127.0.0.1")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LifeTodoDbContext>();
    await db.Database.EnsureCreatedAsync();

    // EnsureCreated only builds the schema for a brand-new database. This table was
    // added later, so an existing local calendar needs it created here to keep its data.
    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "EventOverrides" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_EventOverrides" PRIMARY KEY AUTOINCREMENT,
            "ScheduleEventId" INTEGER NOT NULL,
            "OriginalStart" TEXT NOT NULL,
            "Start" TEXT NOT NULL,
            "End" TEXT NOT NULL,
            "AllDay" INTEGER NOT NULL,
            CONSTRAINT "FK_EventOverrides_Events_ScheduleEventId" FOREIGN KEY ("ScheduleEventId")
                REFERENCES "Events" ("Id") ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_EventOverrides_ScheduleEventId_OriginalStart"
            ON "EventOverrides" ("ScheduleEventId", "OriginalStart");
        """);

    await SeedData.EnsureSeededAsync(db);
}

app.MapDefaultEndpoints();

app.MapGet("/", () => Results.Ok(new
{
    app = "LifeTodo API",
    status = "ok",
    docs = "/openapi/v1.json",
    health = "/health"
}));

app.MapHub<TodoHub>("/hubs/todos");
app.MapTodoEndpoints();
app.MapScheduleEndpoints();
app.MapReminderEndpoints();

app.Run();
