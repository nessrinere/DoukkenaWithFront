using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nop.Core;
using Nop.Core.Domain.Orders;
using Nop.Services.Customers;
using Nop.Services.Orders;
using Nop.Services.Payments;
using Nop.Services.Stores;

namespace YourNamespace.Controllers
{
    [ApiController]
    [Route("api/orders")]
    public class OrdersController : ControllerBase
    {
        private readonly ICustomerService _customerService;
        private readonly IShoppingCartService _shoppingCartService;
        private readonly IOrderProcessingService _orderProcessingService;
        private readonly IStoreContext _storeContext;
        public OrdersController(
            ICustomerService customerService,
            IShoppingCartService shoppingCartService,
            IOrderProcessingService orderProcessingService,
            IStoreContext storeContext)
        {
            _customerService = customerService;
            _shoppingCartService = shoppingCartService;
            _orderProcessingService = orderProcessingService;
            _storeContext = storeContext;
        }

        [HttpPost("place-order/{customerId}")]
        public async Task<IActionResult> PlaceOrder(int customerId)
        {
            var customer = await _customerService.GetCustomerByIdAsync(customerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found." });

            var cartItems = await _shoppingCartService.GetShoppingCartAsync(customer, ShoppingCartType.ShoppingCart);

            if (!cartItems.Any())
                return BadRequest(new { message = "Shopping cart is empty." });

            var store = await _storeContext.GetCurrentStoreAsync();

            var processPaymentRequest = new ProcessPaymentRequest
            {
                CustomerId = customer.Id,
                StoreId = store.Id,
                PaymentMethodSystemName = "Payments.Manual" // Use your configured payment method
            };

            var placeOrderResult = await _orderProcessingService.PlaceOrderAsync(processPaymentRequest);

            if (placeOrderResult.Success)
            {
                return Ok(new
                {
                    message = "Order placed successfully",
                    orderId = placeOrderResult.PlacedOrder.Id
                });
            }
            else
            {
                return BadRequest(new
                {
                    message = "Order placement failed",
                    errors = placeOrderResult.Errors
                });
            }
        }
    }
}
 