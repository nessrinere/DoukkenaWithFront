using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nop.Core.Domain.Media;
using Nop.Core.Domain.Orders;
using Nop.Data;
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
    private readonly IRepository<ShoppingCartItem> _shoppingCartItemRepository;
    public WishlistController(
        IShoppingCartService shoppingCartService,
        ICustomerService customerService,
        IProductService productService,
        IPictureService pictureService,
        IRepository<ShoppingCartItem> shoppingCartItemRepository)
    {
        _shoppingCartService = shoppingCartService;
        _customerService = customerService;
        _productService = productService;
        _pictureService = pictureService;
        _shoppingCartItemRepository = shoppingCartItemRepository;
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddToWishlist([FromBody] WishlistItemDto model)
    {
        if (model == null)
            return BadRequest(new { message = "Invalid data." });

        // Validate customer
        var customer = await _customerService.GetCustomerByIdAsync(model.CustomerId);
        if (customer == null)
            return NotFound(new { message = "Customer not found." });

        // Validate product
        var product = await _productService.GetProductByIdAsync(model.ProductId);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        try
        {
            // Check if the item is already in the wishlist
            var existingItem = (await _shoppingCartService.GetShoppingCartAsync(
                customer,
                ShoppingCartType.Wishlist,
                storeId: 1
            )).FirstOrDefault(x => x.ProductId == product.Id);

            if (existingItem != null)
            {
                return BadRequest(new { message = "Product already in wishlist." });
            }

            // Insert directly into ShoppingCartItem repository
            var wishlistItem = new ShoppingCartItem
            {
                CustomerId = customer.Id,
                ProductId = product.Id,
                ShoppingCartType = ShoppingCartType.Wishlist,
                StoreId = 1,
                Quantity = model.Quantity > 0 ? model.Quantity : 1,
                CreatedOnUtc = DateTime.UtcNow,
                UpdatedOnUtc = DateTime.UtcNow
            };

            await _shoppingCartItemRepository.InsertAsync(wishlistItem);

            return Ok(new { message = "Product added to wishlist successfully." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding product to wishlist: {ex.Message}");
            return StatusCode(500, new { message = "Unable to add product to wishlist." });
        }
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
                ProductId = item.ProductId,
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

    [HttpDelete("remove-by-id/{itemId}")]
    public async Task<IActionResult> RemoveFromWishlistById(int itemId, [FromQuery] int customerId)
    {
        var item = await _shoppingCartItemRepository.GetByIdAsync(itemId);
        if (item == null || item.CustomerId != customerId || item.ShoppingCartTypeId != (int)ShoppingCartType.Wishlist)
            return NotFound(new { message = "Wishlist item not found." });

        await _shoppingCartItemRepository.DeleteAsync(item);

        return Ok(new
        {
            message = "Wishlist item removed successfully.",
            itemId,
            customerId
        });
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
