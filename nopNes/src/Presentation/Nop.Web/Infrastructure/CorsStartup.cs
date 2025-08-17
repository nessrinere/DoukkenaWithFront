// File: Nop.Web/Infrastructure/CorsStartup.cs
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nop.Core.Infrastructure;

namespace Nop.Web.Infrastructure
{
    public class CorsStartup : INopStartup
    {
        public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAngularApp", builder =>
                {
                    builder.WithOrigins("http://localhost:4200")
                           .AllowAnyHeader()
                           .AllowAnyMethod()
                           .AllowCredentials();
                });
            });
        }

        public void Configure(IApplicationBuilder application)
        {
            application.UseCors("AllowAngularApp");
        }

        public int Order => -1000; // Ensure it's added early in pipeline
    }
}
