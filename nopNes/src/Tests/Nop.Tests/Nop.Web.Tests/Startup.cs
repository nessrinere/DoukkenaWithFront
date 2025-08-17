using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;

namespace Nop.Tests.Nop.Web.Tests
{
    public class Startup
    {
        private const string CorsPolicyName = "AllowAngularApp";

        public void ConfigureServices(IServiceCollection services)
        {
            // Add CORS
            services.AddCors(options =>
            {
                options.AddPolicy(CorsPolicyName,
                    builder => builder.WithOrigins("http://localhost:4200") // <-- your Angular URL
                                      .AllowAnyHeader()
                                      .AllowAnyMethod()
                                      .AllowCredentials());
            });

            // Add other services if needed
        }

        public void ConfigureContainer(IServiceCollection services)
        {
            // Register additional dependencies here if needed
        }

        public void Configure(IApplicationBuilder app)
        {
            // Use CORS before other middlewares
            app.UseCors(CorsPolicyName);

            // Example: If using routing or MVC in tests, add here
            // app.UseRouting();
            // app.UseEndpoints(endpoints => {
            //     endpoints.MapControllers();
            // });
        }
    }
}
