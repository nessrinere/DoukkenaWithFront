using Microsoft.AspNetCore.Mvc;
using Nop.Core;
using Nop.Core.Domain.Catalog;
using Nop.Services.Catalog;
using Nop.Services.Vendors;
using Nop.Services.Stores;
using Nop.Services.Media;
using System.Linq;
using Nop.Data;

namespace Nop.Web.Controllers.Api
{
    [Route("api/products")]
    [ApiController]
    public class ProductApiController : Controller
    {
        private readonly IProductService _productService;
        private readonly IVendorService _vendorService;
        private readonly IStoreContext _storeContext;
        private readonly IPictureService _pictureService;
        private readonly IProductAttributeService _productAttributeService;
        protected readonly IRepository<Product> _productRepository;

        public ProductApiController(IProductService productService,
            IVendorService vendorService, IStoreContext storeContext, IPictureService pictureService, 
            IProductAttributeService productAttributeService,
            IRepository<Product> productRepository)
        {
            _productService = productService;
            _vendorService = vendorService;
            _storeContext = storeContext;
            _pictureService = pictureService;
            _productAttributeService = productAttributeService;
            _productRepository = productRepository;
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Name))
                return BadRequest("Product name is required.");

            var product = new Product
            {
                Name = model.Name,
                ShortDescription = model.ShortDescription,
                FullDescription = model.FullDescription,
                Price = model.Price,
                Published = model.Published,
                CreatedOnUtc = DateTime.UtcNow,
                UpdatedOnUtc = DateTime.UtcNow
            };

            await _productService.InsertProductAsync(product);

            return Ok(new
            {
                message = "Product created successfully",
                product.Id,
                product.Name,
                product.Price
            });
        }
        [HttpGet]
        public async Task<IActionResult> GetAllOnHomepage()
        {
            var product = await _productService.GetAllProductsDisplayedOnHomepageAsync();

            var result = product.Select(c => new
            {
                c.Id,
                c.Name,
                c.ShortDescription,
                c.FullDescription,
                c.Price,
                c.Published,
                c.CreatedOnUtc,
                c.UpdatedOnUtc
            });

            return Ok(result);
        }

        [HttpGet("spec/{id:int}")]
        public async Task<IActionResult> GetProductById(int id)
        {
            var product = await _productService.GetProductByIdAsync(id);
            var vendor = await _vendorService.GetVendorByIdAsync(product.VendorId);
            var vendorName = "";
            if (vendor!=null)
            {  vendorName = vendor.Name; }
           
            if (product == null)
                return NotFound($"No product found with ID {id}");

            var result = new
            {
                product.Id,
                product.Name,
                product.FullDescription,
                product.Price,
                product.Sku,
                vendorName
            };

            return Ok(result);
        }
        [HttpGet("search")]
        public async Task<IActionResult> SearchProductsByName([FromQuery] string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Search term is required." });

            var products = await _productRepository.Table
            .Where(p => p.Name.Contains(name)) // raw search
            .ToListAsync();

            var result = products.Select(p => new {
                p.Id,
                p.Name,
                p.ShortDescription,
                p.FullDescription,
                p.Price,
                p.Published
            });

            return Ok(result);
        }
        [HttpGet("category/{categoryId}/products")]
        public async Task<IActionResult> GetProductsByCategoryId(int categoryId)
        {
            var products = await _productService.SearchProductsAsync(
                categoryIds: new List<int> { categoryId },
                pageSize: int.MaxValue
            );

            var result = new List<object>();

            foreach (var product in products)
            {
                var picture = (await _pictureService.GetPicturesByProductIdAsync(product.Id, 1)).FirstOrDefault();

                result.Add(new
                {
                    product.Id,
                    product.Name,
                    product.Price,
                    product.ShortDescription,
                    product.FullDescription,
                    product.Published,
                    product.CreatedOnUtc,
                    product.UpdatedOnUtc,
                    pictureId = picture?.Id ?? 0,
                    seoFilename = picture?.SeoFilename ?? "",
                    mimeType = picture?.MimeType ?? ""
                });
            }

            return Ok(result);
        }
        [HttpGet("product/{productId}/rating")]
        public async Task<IActionResult> GetProductRating(int productId)
        {
            var product = await _productService.GetProductByIdAsync(productId);
            if (product == null)
                return NotFound(new { message = "Product not found" });

            var currentStore = await _storeContext.GetCurrentStoreAsync();
            var reviews = await _productService.GetAllProductReviewsAsync(productId: productId, approved: true, storeId: currentStore.Id);
            if (reviews == null || !reviews.Any())
                return Ok(new { averageRating = 0, totalReviews = 0 });

            var averageRating = reviews.Average(r => r.Rating);
            return Ok(new { averageRating, totalReviews = reviews.Count });
        }


        // GET: api/products/{productId}/reviews
        //[HttpGet("{productId}/reviews")]
        //public async Task<IActionResult> GetProductReviews(int productId)
        // {
        // var product = await _productService.GetProductByIdAsync(productId);
        //     if (product == null)
        // return NotFound(new { message = "Product not found" });

        //var reviews = product.ProductReviews?.Where(r => r.IsApproved).Select(r => new
        //{
        //  r.Title,
        // r.ReviewText,
        // r.Rating,
        // r.CustomerId,
        //  r.CreatedOnUtc
        //}).ToList();

        // return Ok(reviews);
        // }
        //}
        [HttpGet("attributes/{productId}")]
        public async Task<IActionResult> GetProductAttributes(int productId)
        {
            if (productId <= 0)
                return BadRequest(new { message = "Invalid product ID." });

            var product = await _productService.GetProductByIdAsync(productId);
            if (product == null || product.Deleted)
                return NotFound(new { message = "Product not found." });

            // Get product attribute mappings
            var mappings = await _productAttributeService.GetProductAttributeMappingsByProductIdAsync(productId);
            if (mappings == null || !mappings.Any())
                return Ok(new { productId, productName = product.Name, attributes = new List<object>() });

            var attributeList = new List<object>();

            foreach (var mapping in mappings)
            {
                var attribute = await _productAttributeService.GetProductAttributeByIdAsync(mapping.ProductAttributeId);
                if (attribute == null)
                    continue;

                var values = await _productAttributeService.GetProductAttributeValuesAsync(mapping.Id) ?? new List<ProductAttributeValue>();

                attributeList.Add(new
                {
                    AttributeId = attribute.Id,
                    AttributeName = attribute.Name,
                    AttributeDescription = attribute.Description,
                    IsRequired = mapping.IsRequired,
                    AttributeControlType = mapping.AttributeControlType.ToString(),
                    DisplayOrder = mapping.DisplayOrder,
                    Values = values.Select(v => new
                    {
                        v.Id,
                        v.Name,
                        v.ColorSquaresRgb,
                        v.PriceAdjustment,
                        v.WeightAdjustment,
                        v.Cost,
                        v.CustomerEntersQty,
                        v.Quantity,
                        v.IsPreSelected,
                        v.DisplayOrder,
                        v.PictureId
                    }).OrderBy(v => v.DisplayOrder).ToList()
                });
            }

            return Ok(new
            {
                productId,
                productName = product.Name,
                attributes = attributeList.OrderBy(a => ((dynamic)a).DisplayOrder).ToList()
            });
        }
        // Add this new endpoint to the ProductApiController class
        /*  [HttpGet("filter")]
          public async Task<IActionResult> FilterProducts(
              [FromQuery] decimal? minPrice = null,
              [FromQuery] decimal? maxPrice = null,
              [FromQuery] string? categoryIds = null, // Changed to string to handle comma-separated values
              [FromQuery] bool? onSale = null,
              [FromQuery] string? keywords = null,
              [FromQuery] int pageIndex = 0,
              [FromQuery] int pageSize = 50)
          {
              try
              {
                  // Validate pagination parameters
                  if (pageIndex < 0)
                      pageIndex = 0;
                  if (pageSize <= 0 || pageSize > 100)
                      pageSize = 50;

                  // Validate price range
                  if (minPrice.HasValue && maxPrice.HasValue && maxPrice < minPrice)
                      return BadRequest(new { message = "Invalid price range: maxPrice cannot be less than minPrice." });

                  // Parse category IDs from comma-separated string
                  List<int>? categoryList = null;
                  if (!string.IsNullOrEmpty(categoryIds))
                  {
                      try
                      {
                          categoryList = categoryIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                              .Select(id => int.Parse(id.Trim()))
                              .Where(id => id > 0)
                              .ToList();
                      }
                      catch (FormatException)
                      {
                          return BadRequest(new { message = "Invalid category IDs format. Use comma-separated integers." });
                      }
                  }

                  // Search products with all filters
                  var products = await _productService.SearchProductsAsync(
                      categoryIds: categoryList,
                      keywords: keywords,
                      priceMin: minPrice,
                      priceMax: maxPrice,
                      pageIndex: pageIndex,
                      pageSize: pageSize,
                      showHidden: false,
                      overridePublished: true
                  );

                  var result = new List<object>();

                  foreach (var product in products)
                  {
                      try
                      {
                          // Get product picture
                          var pictures = await _pictureService.GetPicturesByProductIdAsync(product.Id, 1);
                          var picture = pictures?.FirstOrDefault();

                          // Check if product is on sale (has special price or discount)
                          var isOnSale = product.SpecialPrice.HasValue && 
                                        product.SpecialPrice < product.Price &&
                                        (!product.SpecialPriceStartDateTimeUtc.HasValue || product.SpecialPriceStartDateTimeUtc <= DateTime.UtcNow) &&
                                        (!product.SpecialPriceEndDateTimeUtc.HasValue || product.SpecialPriceEndDateTimeUtc >= DateTime.UtcNow);

                          // Apply onSale filter
                          if (onSale.HasValue)
                          {
                              if (onSale.Value && !isOnSale) continue;
                              if (!onSale.Value && isOnSale) continue;
                          }

                          var currentPrice = isOnSale ? product.SpecialPrice ?? product.Price : product.Price;
                          var originalPrice = isOnSale ? product.Price : (decimal?)null;

                          result.Add(new
                          {
                              product.Id,
                              product.Name,
                              product.ShortDescription,
                              product.FullDescription,
                              Price = currentPrice,
                              OriginalPrice = originalPrice,
                              IsOnSale = isOnSale,
                              product.Published,
                              product.CreatedOnUtc,
                              product.UpdatedOnUtc,
                              pictureId = picture?.Id ?? 0,
                              seoFilename = picture?.SeoFilename ?? "",
                              mimeType = picture?.MimeType ?? ""
                          });
                      }
                      catch (Exception productEx)
                      {
                          // Log individual product processing errors but continue with others
                          Console.WriteLine($"Error processing product {product.Id}: {productEx.Message}");
                          continue;
                      }
                  }

                  return Ok(new
                  {
                      products = result,
                      totalCount = products.TotalCount,
                      pageIndex,
                      pageSize,
                      totalPages = (int)Math.Ceiling((double)products.TotalCount / pageSize)
                  });
              }
              catch (Exception ex)
              {
                  return StatusCode(500, new { message = "An error occurred while filtering products.", error = ex.Message });
              }
          }
        */
        [HttpGet("filter")]
        public async Task<IActionResult> FilterProducts(
    [FromQuery] decimal? minPrice = null,
    [FromQuery] decimal? maxPrice = null,
    [FromQuery] int[] categoryIds = null,
    [FromQuery] bool onSale = false)
        {
            try
            {
                // Replace the non-existent 'SpecialPrice' property with a valid approach to filter by sale.
                // Assuming 'OldPrice' is used to determine if a product is on sale.
                var products = await _productService.SearchProductsAsync(
                    pageIndex: 0,
                    pageSize: int.MaxValue,
                    categoryIds: categoryIds?.ToList()
                );

                var query = products.AsQueryable();

                // Apply price filters
                if (minPrice.HasValue)
                {
                    query = query.Where(p => p.Price >= minPrice.Value);
                }

                if (maxPrice.HasValue)
                {
                    query = query.Where(p => p.Price <= maxPrice.Value);
                }

                // Apply sale filter (assuming 'OldPrice' is greater than 'Price' for products on sale)
                if (onSale)
                {
                    query = query.Where(p => p.OldPrice > p.Price);
                }

                // Apply additional filters (published, not deleted, etc.)
                query = query.Where(p => p.Published && !p.Deleted);

                var filteredProducts = query.ToList();

                return Ok(new { products = filteredProducts, total = filteredProducts.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error filtering products", error = ex.Message });
            }
        }
    }


    public class CreateProductRequest
    {
        public string Name { get; set; }
        public string ShortDescription { get; set; }
        public string FullDescription { get; set; }
        public decimal Price { get; set; }
        public bool Published { get; set; }
    }
}
