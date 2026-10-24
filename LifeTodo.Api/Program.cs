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
