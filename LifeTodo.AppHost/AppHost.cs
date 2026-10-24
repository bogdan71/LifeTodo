var builder = DistributedApplication.CreateBuilder(args);

// Local-first: one SQLite file shared by every way of starting the app.
var dataDirectory = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", "data"));
Directory.CreateDirectory(dataDirectory);
var databaseFile = Path.Combine(dataDirectory, "lifetodo.db");

// The API owns schema creation and seeding on startup.
var api = builder.AddProject<Projects.LifeTodo_Api>("api")
    .WithEnvironment("ConnectionStrings__lifetodo", $"Data Source={databaseFile}");

// Vite dev server, proxied through the API for /api and /hubs.
builder.AddViteApp("web", "../lifetodo-web")
    .WithReference(api)
    .WaitFor(api);

builder.Build().Run();
