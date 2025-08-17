using Microsoft.AspNetCore.Mvc;
using Nop.Core;
using Nop.Services.Catalog;
using Nop.Services.Common;

namespace Nop.Web.Controllers.Api
{
    [Route("api/recentlyViewed")]
    [ApiController]
    public class RecentlyViewedProductsController : ControllerBase
    {
        private readonly IRecentlyViewedProductsService _recentlyViewedProductsService;
        private readonly IProductService _productService;
        private readonly IWorkContext _workContext;

        public RecentlyViewedProductsController(
            IRecentlyViewedProductsService recentlyViewedProductsService,
            IProductService productService,
            IWorkContext workContext)
        {
            _recentlyViewedProductsService = recentlyViewedProductsService;
            _productService = productService;
            _workContext = workContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetRecentlyViewedProducts(int count = 10)
        {
            var products = await _recentlyViewedProductsService.GetRecentlyViewedProductsAsync(count);

            var result = products.Select(p => new
            {
                p.Id,
                p.Name,
                p.ShortDescription,
                // Optional: add pricing or image URL if needed
            });

            return Ok(result);
        }
    }
}
