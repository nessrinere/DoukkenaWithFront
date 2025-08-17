using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Mvc;
using Nop.Core.Domain.Catalog;
using Nop.Data;
using Nop.Services.Catalog;
using Nop.Services.Customers;
using Nop.Services.Media;
using static SkiaSharp.HarfBuzz.SKShaper;

namespace Nop.Web.Controllers.Api;

[Route("api/review")]
[ApiController] // Add this attribute to enable API-specific behavior, including model validation and helper methods like BadRequest.
public class ProductReviewApiController : ControllerBase // Change the base class to ControllerBase to access BadRequest and other helper methods.
{
    private readonly IProductService _productService;
    private readonly ICustomerService _customerService;
    private readonly IRepository<ProductReview> _productReviewRepository;

    public ProductReviewApiController(
        IProductService productService,
        ICustomerService customerService,
        IRepository<ProductReview> productReviewRepository)
    {
        _productService = productService;
        _customerService = customerService;
        _productReviewRepository = productReviewRepository;
    }

    [HttpPost]
    public async Task<IActionResult> SubmitReview([FromBody] ProductReviewRequest model)
    {
        if (model.Rating < 1 || model.Rating > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        var customer = await _customerService.GetCustomerByIdAsync(model.CustomerId);
        if (customer == null)
            return BadRequest(new { message = "Customer not found." });

        var product = await _productService.GetProductByIdAsync(model.ProductId);
        if (product == null)
            return BadRequest(new { message = "Product not found." });

        var review = new ProductReview
        {
            ProductId = product.Id,
            CustomerId = customer.Id,
            Title = model.Title,
            ReviewText = model.ReviewText,
            Rating = model.Rating,
            IsApproved = true,
            CreatedOnUtc = DateTime.UtcNow,
            StoreId = 1
        };

        await _productReviewRepository.InsertAsync(review);

        return Ok(new { message = "Review submitted successfully." });
    }
    [HttpGet]
    public async Task<IActionResult> GetAllReviews()
    {
        var reviews = await _productReviewRepository.Table.ToListAsync();
        var result = new List<object>();

        foreach (var review in reviews)
        {
            var customer = await _customerService.GetCustomerByIdAsync(review.CustomerId);
            var product = await _productService.GetProductByIdAsync(review.ProductId);

            result.Add(new
            {
                review.Id,
                Product = product?.Name,
                Customer = customer?.Email,
                review.Title,
                review.ReviewText,
                review.Rating,
                review.IsApproved,
                review.CreatedOnUtc
            });
        }

        return Ok(result);
    }
    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetReviewsByProductId(int productId)
    {
        var reviews = await _productReviewRepository.GetAllAsync(query => query.Where(r => r.ProductId == productId));
        var result = new List<object>();

        foreach (var review in reviews)
        {
            var customer = await _customerService.GetCustomerByIdAsync(review.CustomerId);
            var product = await _productService.GetProductByIdAsync(review.ProductId);

            result.Add(new
            {
                review.Id,
                Product = product?.Name,
                Customer = customer?.Email,
                review.Title,
                review.ReviewText,
                review.Rating,
                review.IsApproved,
                review.CreatedOnUtc
            });
        }

        return Ok(result);
    }
    [HttpGet("product/{productId}/rating")]
    public async Task<IActionResult> GetProductRating(int productId)
    {
        var product = await _productService.GetProductByIdAsync(productId);
        if (product == null)
            return NotFound(new { message = "Product not found." });
var reviews = await _productReviewRepository.GetAllAsync(query =>
    query.Where(r => r.ProductId == productId && r.IsApproved));

        if (!reviews.Any())
            return Ok(new { rating = 0, total = 0 });

        var averageRating = reviews.Average(r => r.Rating);
        var totalReviews = reviews.Count();

        return Ok(new { rating = averageRating, total = totalReviews });
    }
    public class ProductReviewRequest
    {
        public int ProductId { get; set; }
        public int CustomerId { get; set; }
        public string Title { get; set; }
        public string ReviewText { get; set; }
        public int Rating { get; set; } // 1 to 5
    }
}
