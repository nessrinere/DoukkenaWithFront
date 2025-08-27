using Microsoft.AspNetCore.Mvc;
using Nop.Web.Framework.Controllers;

namespace Nop.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class HelloWorldController : Controller
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok("Hello World");
        }
        
        [HttpPost]
        public IActionResult Post([FromBody] string message)
        {
            return Ok($"You sent: {message}");
        }
    }
}