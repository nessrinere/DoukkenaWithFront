using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nop.Core;
using Nop.Core.Domain.Customers;
using Nop.Core.Domain.Orders;
using Nop.Data;
using Nop.Services.Authentication;
using Nop.Services.Catalog;
using Nop.Services.Customers;
using Nop.Services.Messages;
using Nop.Services.Orders;

namespace Nop.Web.Controllers.Api
{
    [Route("api/customers")]
    [ApiController]
    public class CustomerApiController : ControllerBase
    {
        private readonly ICustomerService _customerService;
        private readonly ICustomerRegistrationService _customerRegistrationService;
        private readonly IShoppingCartService _shoppingCartService;
        private readonly IProductService _productService;
        private readonly IRepository<CustomerPassword> _customerPasswordRepository;
        private readonly IAuthenticationService _authenticationService;
        private readonly IWorkContext _workContext;
        private readonly IOrderService _orderService;
        private readonly IWorkflowMessageService _workflowMessageService;
        private readonly IRepository<ShoppingCartItem> _shoppingCartItemRepository;
        public CustomerApiController(ICustomerService customerService, ICustomerRegistrationService customerRegistrationService,
            IProductService productService, IRepository<CustomerPassword> customerPasswordRepository,
            IAuthenticationService authenticationService, IWorkContext workContext, IShoppingCartService shoppingCartService, IOrderService orderService, IWorkflowMessageService workflowMessageService,
            IRepository<ShoppingCartItem> shoppingCartItemRepository)
        {
            _customerService = customerService;
            _customerRegistrationService = customerRegistrationService;
            _productService = productService;
            _customerPasswordRepository = customerPasswordRepository;
            _authenticationService = authenticationService;
            _workContext = workContext;
            _shoppingCartService = shoppingCartService;
            _orderService = orderService;
            _workflowMessageService = workflowMessageService;
            _shoppingCartItemRepository = shoppingCartItemRepository;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCustomerById(int id)
        {
            var customer = await _customerService.GetCustomerByIdAsync(id);
            if (customer == null)
                return NotFound();

            return Ok(new
            {
                customer.Id,
                customer.Email,
                customer.Username,
                customer.Active,
                customer.CreatedOnUtc
            });
        }

        [HttpGet("by-email/{email}")]
        public async Task<IActionResult> GetCustomerByEmail(string email)
        {
            var passwordRecord = new CustomerPassword();
            var customer = await _customerService.GetCustomerByEmailAsync(email);
            if (customer != null)
            {
                passwordRecord = _customerPasswordRepository.Table
                .Where(cp => cp.CustomerId == customer.Id)
                .OrderByDescending(cp => cp.CreatedOnUtc)
                .FirstOrDefault();
            }



            if (customer == null)
                return NotFound($"No customer found with email: {email}");
            var result = new
            {
                id = customer.Id,
                name = customer.Username,
                pass = passwordRecord.Password
            };


            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllCustomers()
        {
            var customers = await _customerService.GetAllCustomersAsync();

            var result = customers.Select(c => new
            {
                c.Id,
                c.Email,
                c.Username,
                c.Active,
                c.CreatedOnUtc
            });

            return Ok(result);
        }
        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] SignupRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) ||
            string.IsNullOrWhiteSpace(model.Username) ||
            string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest("Email, Username, and Password are required.");
            }
 var existingCustomer = await _customerService.GetCustomerByEmailAsync(model.Email);
            if (existingCustomer != null)
            {
                return BadRequest("A customer with this email already exists.");
            }

            var customer = new Customer
            {
                CustomerGuid = Guid.NewGuid(),
                Email = model.Email,
                Username = model.Username,
                Active = true,
                CreatedOnUtc = DateTime.UtcNow
            };

            await _customerService.InsertCustomerAsync(customer);

            var registrationRequest = new CustomerRegistrationRequest(
                customer,
                model.Email,
                model.Username,
                model.Password,
                PasswordFormat.Hashed,
                storeId: 1 // replace with your actual store ID
            );

            var registrationResult = await _customerRegistrationService.RegisterCustomerAsync(registrationRequest);
            if (!registrationResult.Success)
            {
                await _customerService.DeleteCustomerAsync(customer);
                return BadRequest(registrationResult.Errors);
            }

            // Send confirmation email
            await _workflowMessageService.SendCustomerEmailValidationMessageAsync(customer, 1);

            return Ok(new
            {
                message = "Customer created successfully. Please check your email to confirm your account.",
                customer.Id,
                customer.Email,
                customer.Username
            });
        }

        public class SignupRequest
        {
            public string Email { get; set; }
            public string Username { get; set; }
            public string Password { get; set; }
        }

        [HttpPost("login")]
        public async Task<IActionResult> SecureLogin([FromBody] LoginRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) ||
                string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest("Email and Password are required.");
            }

            try
            {
                // Validate customer credentials using the existing service
                var loginResult = await _customerRegistrationService.ValidateCustomerAsync(model.Email, model.Password);

                switch (loginResult)
                {
                    case CustomerLoginResults.Successful:
                        // Get the customer
                        var customer = await _customerService.GetCustomerByEmailAsync(model.Email);

                        if (customer == null)
                            return BadRequest("Authentication failed.");

                        // Set the current customer in the work context
                        await _workContext.SetCurrentCustomerAsync(customer);

                        // Sign in the customer for session management
                        await _authenticationService.SignInAsync(customer, model.RememberMe);

                        return Ok(new
                        {
                            success = true,
                            message = "Login successful",
                            customer = new
                            {
                                id = customer.Id,
                                email = customer.Email,
                                username = customer.Username,
                                isActive = customer.Active
                            }
                        });

                    case CustomerLoginResults.CustomerNotExist:
                        return BadRequest("Customer does not exist.");

                    case CustomerLoginResults.WrongPassword:
                        return BadRequest("Invalid password.");

                    case CustomerLoginResults.NotActive:
                        return BadRequest("Customer account is not active.");

                    case CustomerLoginResults.Deleted:
                        return BadRequest("Customer account has been deleted.");

                    case CustomerLoginResults.NotRegistered:
                        return BadRequest("Customer is not registered.");

                    case CustomerLoginResults.LockedOut:
                        return BadRequest("Account is temporarily locked due to failed login attempts.");

                    case CustomerLoginResults.MultiFactorAuthenticationRequired:
                        return Ok(new
                        {
                            success = false,
                            requiresMFA = true,
                            message = "Multi-factor authentication required"
                        });

                    default:
                        return BadRequest("Authentication failed.");
                }
            }
            catch (Exception ex)
            {
                // Log the exception (you might want to inject ILogger)
                return StatusCode(500, "An error occurred during authentication.");
            }

        }

        [HttpPost("cart/save")]
        public async Task<IActionResult> SaveShoppingCartItems([FromBody] List<ShoppingCartItemDto> cartItems)
        {
            if (cartItems == null || !cartItems.Any())
                return BadRequest(new { message = "Cart is empty." });
            var customer = await _customerService.GetCustomerByIdAsync(cartItems[0].CustomerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found" });

            foreach (var item in cartItems)
            {
                var product = await _productService.GetProductByIdAsync(item.ProductId);
                if (product == null)
                    continue;

                await _shoppingCartService.AddToCartAsync(
                    customer,
                    product,
                    ShoppingCartType.ShoppingCart,
                    storeId: 1, // You can use the actual store ID
                    quantity: item.Quantity
                );
            }

            return Ok(new { message = "Cart items saved successfully." });
        }
        [HttpPost("cart/items")]
        public async Task<IActionResult> SaveItems([FromBody] ShoppingCartItemDto cartItems)
        {
            if (cartItems == null)
                return BadRequest(new { message = "Cart is empty." });

            var customer = await _customerService.GetCustomerByIdAsync(cartItems.CustomerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found" });

            var product = await _productService.GetProductByIdAsync(cartItems.ProductId);
            if (product == null)
                return NotFound(new { message = "Product not found" });

            var cartItem = new ShoppingCartItem
            {
                CustomerId = customer.Id,
                ProductId = product.Id,
                ShoppingCartType = ShoppingCartType.ShoppingCart,
                StoreId = 1,
                Quantity = cartItems.Quantity,
                CreatedOnUtc = DateTime.UtcNow,
                UpdatedOnUtc = DateTime.UtcNow
            };

            await _shoppingCartItemRepository.InsertAsync(cartItem);

            return Ok(new { message = "Item saved successfully (direct insert)." });
        }

        [HttpGet("cart/items/{customerId}")]
        public async Task<IActionResult> GetCartItemsByCustomerId(int customerId)
        {
            var customer = await _customerService.GetCustomerByIdAsync(customerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found" });
            var cartItems = await _shoppingCartService.GetShoppingCartAsync(customer, ShoppingCartType.ShoppingCart);

            if (cartItems == null || !cartItems.Any())
                return Ok(new { message = "No items found in the cart." });

            var result = new List<object>();

            foreach (var item in cartItems)
            {
                var product = await _productService.GetProductByIdAsync(item.ProductId);
                if (product != null)
                {
                    result.Add(new
                    {
                        item.Id,
                        item.Quantity,
                        item.CreatedOnUtc,
                        ProductId = product.Id,
                        ProductName = product.Name,
                        ProductPrice = product.Price,
                        SKU = product.Sku
                    });
                }
            }

            return Ok(result);
        }

        [HttpDelete("{customerId}/cart/items/{productId}")]
        public async Task<IActionResult> DeleteCartItem(int customerId, int productId)
        {
            // Validate customer
            var customer = await _customerService.GetCustomerByIdAsync(customerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found" });

            // Get the shopping cart items for this customer
            var cartItems = await _shoppingCartService.GetShoppingCartAsync(customer, ShoppingCartType.ShoppingCart);
            
            // Find the specific cart item to delete
            var itemToDelete = cartItems.FirstOrDefault(item => item.ProductId == productId);
            if (itemToDelete == null)
                return NotFound(new { message = "Cart item not found" });

            // Delete the cart item using the shopping cart service
            await _shoppingCartService.DeleteShoppingCartItemAsync(itemToDelete);

            return Ok(new { message = "Cart item deleted successfully" });
        }

        // Models/PlaceOrderRequest.cs
        public class PlaceOrderRequest
        {
            public int CustomerId { get; set; }
        }

        [HttpPost("cart/placeorder")]
        public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderRequest model)
        {
            // Validate input
            if (model.CustomerId <= 0)
                return BadRequest(new { message = "Invalid CustomerId." });

            // 1. Get customer
            var customer = await _customerService.GetCustomerByIdAsync(model.CustomerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found." });

            // 2. Get shopping cart
            var cart = await _shoppingCartService.GetShoppingCartAsync(customer);
            if (cart == null || !cart.Any())
                return BadRequest(new { message = "Shopping cart is empty." });

            // 3. Calculate total and validate products
            decimal total = 0;

            foreach (var item in cart)
            {
                var product = await _productService.GetProductByIdAsync(item.ProductId);
                if (product == null)
                    return BadRequest(new { message = $"Product {item.ProductId} not found." });

                if (product.StockQuantity < item.Quantity)
                    return BadRequest(new { message = $"Not enough stock for product {product.Name}." });

                total += product.Price * item.Quantity;

                // Update stock
                product.StockQuantity -= item.Quantity;
                await _productService.UpdateProductAsync(product);
            }

            // 4. Create the order using domain entity
            var order = new Nop.Core.Domain.Orders.Order
            {
                CustomerId = customer.Id,
                CreatedOnUtc = DateTime.UtcNow,
                OrderTotal = total,
                OrderStatusId = 10 // Pending status
            };

            await _orderService.InsertOrderAsync(order);

            // 5. Clear the cart
            await _shoppingCartService.ClearShoppingCartAsync(customer, 1);

            return Ok(new
            {
                message = "Order placed successfully.",
                orderId = order.Id,
                totalAmount = total
            });
        }
    }
        public class LoginRequest
        {
            public string Email { get; set; }
            public string Password { get; set; }
            public bool RememberMe { get; set; } = false;
        }
    

    public class ShoppingCartItemDto
    {
        public int CustomerId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }
    public class CreateCustomerRequest
    {
        public string Email { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
    }


}
