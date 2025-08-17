using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nop.Core.Domain.Media;
using Nop.Core.Domain.Orders;
using Nop.Services.Catalog;
using Nop.Services.Customers;
using Nop.Services.Media;
using Nop.Services.Orders;

namespace Nop.Web.Controllers.Api;

[Route("api/wishlist")]
[ApiController]
public class WishlistController : ControllerBase
{
    private readonly IShoppingCartService _shoppingCartService;
    private readonly ICustomerService _customerService;
    private readonly IProductService _productService;
    private readonly IPictureService _pictureService;

    public WishlistController(
        IShoppingCartService shoppingCartService,
        ICustomerService customerService,
        IProductService productService,
        IPictureService pictureService)
    {
        _shoppingCartService = shoppingCartService;
        _customerService = customerService;
        _productService = productService;
        _pictureService = pictureService;
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddToWishlist([FromBody] WishlistItemDto model)
    {
        if (model == null)
            return BadRequest(new { message = "Invalid data." });

        var customer = await _customerService.GetCustomerByIdAsync(model.CustomerId);
        if (customer == null)
            return NotFound(new { message = "Customer not found." });

        var product = await _productService.GetProductByIdAsync(model.ProductId);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        await _shoppingCartService.AddToCartAsync(
            customer,
            product,
            ShoppingCartType.Wishlist,
            storeId: 1,
            quantity: model.Quantity
        );

        return Ok(new { message = "Product added to wishlist." });
    }

    [HttpGet("{customerId}")]
    public async Task<IActionResult> GetWishlistItems(int customerId)
    {
        if (customerId <= 0)
            return BadRequest(new { message = "Invalid customer ID." });

        var customer = await _customerService.GetCustomerByIdAsync(customerId);
        if (customer == null)
            return NotFound(new { message = "Customer not found." });

        var wishlistItems = await _shoppingCartService.GetShoppingCartAsync(
            customer,
            ShoppingCartType.Wishlist,
            storeId: 1
        );

        if (wishlistItems == null || !wishlistItems.Any())
            return Ok(new List<object>());

        var result = new List<object>();

        foreach (var item in wishlistItems)
        {
            var product = await _productService.GetProductByIdAsync(item.ProductId);
            if (product == null)
                continue;

            var imageUrl = await _pictureService.GetDefaultPictureUrlAsync(product.Id);

            result.Add(new
            {
                Id = item.Id,
                ProductId = product.Id,
                Name = product.Name,
                ShortDescription = product.ShortDescription,
                Quantity = item.Quantity,
                Price = product.Price,
                Published = product.Published,
                CreatedOnUtc = item.CreatedOnUtc,
                ImageUrl = imageUrl
            });
        }

        return Ok(result);
    }

    [HttpDelete("remove")]
    public async Task<IActionResult> RemoveFromWishlist([FromQuery] int customerId, [FromQuery] int productId)
    {
        try
        {
            // Validate input parameters
            if (customerId <= 0)
                return BadRequest(new { message = "Invalid customer ID." });

            if (productId <= 0)
                return BadRequest(new { message = "Invalid product ID." });

            // Verify customer exists
            var customer = await _customerService.GetCustomerByIdAsync(customerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found." });

            // Verify product exists
            var product = await _productService.GetProductByIdAsync(productId);
            if (product == null)
                return NotFound(new { message = "Product not found." });

            // Get the wishlist items for the customer
            var wishlistItems = await _shoppingCartService.GetShoppingCartAsync(
                customer,
                ShoppingCartType.Wishlist,
                storeId: 1
            );

            // Find the specific item to remove
            var itemToRemove = wishlistItems.FirstOrDefault(x => x.ProductId == productId);
            if (itemToRemove == null)
                return NotFound(new { message = "Product not found in wishlist." });

            // Remove the item from wishlist
            await _shoppingCartService.DeleteShoppingCartItemAsync(itemToRemove);

            return Ok(new { 
                message = "Product removed from wishlist successfully.",
                productId = productId,
                customerId = customerId
            });
        }
        catch (Exception ex)
        {
            // Log the exception (you might want to use a proper logging framework)
            Console.WriteLine($"Error removing from wishlist: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while removing the item from wishlist." });
        }
    }

    [HttpDelete("clear")]
    public async Task<IActionResult> ClearWishlist([FromQuery] int customerId)
    {
        try
        {
            // Validate input parameter
            if (customerId <= 0)
                return BadRequest(new { message = "Invalid customer ID." });

            // Verify customer exists
            var customer = await _customerService.GetCustomerByIdAsync(customerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found." });

            // Get all wishlist items for the customer
            var wishlistItems = await _shoppingCartService.GetShoppingCartAsync(
                customer,
                ShoppingCartType.Wishlist,
                storeId: 1
            );

            if (wishlistItems.Any())
            {
                foreach (var wish in wishlistItems)
                {
                    await _shoppingCartService.DeleteShoppingCartItemAsync(wish);
                }
               
            }

            return Ok(new { 
                message = "Wishlist cleared successfully.",
                customerId = customerId,
                itemsRemoved = wishlistItems.Count()
            });
        }
        catch (Exception ex)
        {
            // Log the exception (you might want to use a proper logging framework)
            Console.WriteLine($"Error clearing wishlist: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while clearing the wishlist." });
        }
    }

    public class WishlistItemDto
    {
        public int CustomerId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; } = 1;
    }
}
