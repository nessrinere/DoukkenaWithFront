using Microsoft.AspNetCore.Mvc;
using Nop.Services.Catalog;

namespace Nop.Web.Controllers.Api
{

    [Route("api/attributes")]
    [ApiController]
    public class ProductAttributesController : Controller
    {
        private readonly IProductAttributeService _productAttributeService;
        private readonly IProductService _productService;

        [HttpGet("att/by-product/{productId}")]
        public async Task<IActionResult> GetAttributesByProductId(int productId)
        {
            var attributeMappings = await _productService.GetProductByIdAsync(productId);

          
            return Ok(attributeMappings);
        }

        [HttpGet("product/{productId}/attributes")]
        public async Task<IActionResult> GetProductAttributes(int productId)
        {
            if (productId <= 0)
                return BadRequest(new { message = "Invalid product ID." });

            var mappings = await _productAttributeService.GetProductAttributeMappingsByProductIdAsync(productId);
            if (mappings == null || !mappings.Any())
                return Ok(new List<object>()); // No attributes found

            var attributeList = new List<object>();

            foreach (var mapping in mappings)
            {
                var attribute = await _productAttributeService.GetProductAttributeByIdAsync(mapping.ProductAttributeId);
                if (attribute == null)
                    continue;

                var values = await _productAttributeService.GetProductAttributeValuesAsync(mapping.Id) ?? new List<Nop.Core.Domain.Catalog.ProductAttributeValue>();

                attributeList.Add(new
                {
                    AttributeId = attribute.Id,
                    AttributeName = attribute.Name,
                    Values = values.Select(v => new
                    {
                        v.Id,
                        v.Name,
                        v.PriceAdjustment,
                        v.IsPreSelected
                    }).ToList()
                });
            }

            return Ok(attributeList);
        }
    }


}
