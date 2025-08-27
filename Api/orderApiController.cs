using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nop.Core.Domain.Orders;
using Nop.Core.Domain.Common;
using Nop.Services.Orders;
using Nop.Services.Customers;
using Nop.Services.Common;
using Nop.Data;
using Nop.Services.Catalog;
using Nop.Core.Domain.Payments;
using Nop.Core.Domain.Shipping;

namespace Nop.Web.Controllers.Api
{
    [ApiController]
    [Route("api/order")]
    public class OrderApiController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ICustomerService _customerService;
        private readonly IAddressService _addressService;
        private readonly IRepository<Order> _orderRepository;
        private readonly IRepository<OrderItem> _orderItemRepository;
        private readonly IProductService _productService;

        public OrderApiController(
            IOrderService orderService,
            ICustomerService customerService,
            IAddressService addressService,
            IRepository<Order> orderRepository,
            IRepository<OrderItem> orderItemRepository,
            IProductService productService)
        {
            _orderService = orderService;
            _customerService = customerService;
            _addressService = addressService;
            _orderRepository = orderRepository;
            _orderItemRepository = orderItemRepository;
            _productService = productService;
        }

        // DTOs

        public class CreateAddressRequest
        {
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public string Email { get; set; }
            public int CountryId { get; set; }  // Set proper Country ID here
            public int StateProvinceId { get; set; }  // Set proper StateProvince ID here
            public string City { get; set; }
            public string Address1 { get; set; }
            public string Address2 { get; set; }
            public string ZipPostalCode { get; set; }
            public string PhoneNumber { get; set; }
            public string FaxNumber { get; set; }
        }

        public class CreateOrderRequest
        {
            public int CustomerId { get; set; }
            public int BillingAddressId { get; set; }
            public int ShippingAddressId { get; set; }
        }

        public class AddOrderItemRequest
        {
            public int OrderId { get; set; }
            public int ProductId { get; set; }
            public int Quantity { get; set; }
        }

        // POST api/order/create-address
        [HttpPost("create-address")]
        public async Task<IActionResult> CreateAddress([FromBody] CreateAddressRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
                return BadRequest("FirstName and LastName are required.");

            var address = new Address
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                CountryId = request.CountryId,
                StateProvinceId = request.StateProvinceId,
                City = request.City,
                Address1 = request.Address1,
                Address2 = request.Address2,
                ZipPostalCode = request.ZipPostalCode,
                PhoneNumber = request.PhoneNumber,
                FaxNumber = request.FaxNumber,
                CreatedOnUtc = DateTime.UtcNow
            };

            await _addressService.InsertAddressAsync(address);

            return Ok(new
            {
                success = true,
                addressId = address.Id
            });
        }

        // POST api/order/create
        [HttpPost("create")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var customer = await _customerService.GetCustomerByIdAsync(request.CustomerId);
            if (customer == null)
                return NotFound("Customer not found.");

            // Validate billing and shipping addresses exist
            var billingAddress = await _addressService.GetAddressByIdAsync(request.BillingAddressId);
            if (billingAddress == null)
                return BadRequest("Billing address not found.");

            var shippingAddress = await _addressService.GetAddressByIdAsync(request.ShippingAddressId);
            if (shippingAddress == null)
                return BadRequest("Shipping address not found.");

            var order = new Order
            {
                CustomerId = customer.Id,
                OrderGuid = Guid.NewGuid(),
                OrderStatus = OrderStatus.Pending,
                PaymentStatus = PaymentStatus.Pending,
                ShippingStatus = ShippingStatus.NotYetShipped,
                BillingAddressId = billingAddress.Id,
                ShippingAddressId = shippingAddress.Id,
                CustomOrderNumber = Guid.NewGuid().ToString(),
                CreatedOnUtc = DateTime.UtcNow
            };

            await _orderService.InsertOrderAsync(order);

            return Ok(new
            {
                success = true,
                orderId = order.Id,
                orderGuid = order.OrderGuid
            });
        }

        // POST api/order/add-item
        [HttpPost("add-item")]
        public async Task<IActionResult> AddOrderItem([FromBody] AddOrderItemRequest request)
        {
            var order = await _orderRepository.GetByIdAsync(request.OrderId);
            if (order == null)
                return NotFound($"Order with ID {request.OrderId} not found.");

            var product = await _productService.GetProductByIdAsync(request.ProductId);
            if (product == null)
                return NotFound($"Product with ID {request.ProductId} not found.");

            var orderItem = new OrderItem
            {
                OrderId = order.Id,
                ProductId = product.Id,
                OrderItemGuid = Guid.NewGuid(),
                Quantity = request.Quantity,
                UnitPriceInclTax = product.Price,
                UnitPriceExclTax = product.Price,
                PriceInclTax = product.Price * request.Quantity,
                PriceExclTax = product.Price * request.Quantity,
                DiscountAmountInclTax = 0,
                DiscountAmountExclTax = 0,
                OriginalProductCost = product.Price,
                AttributeDescription = "",
                AttributesXml = "",
                DownloadCount = 0,
                IsDownloadActivated = false,
                LicenseDownloadId = 0,
                ItemWeight = product.Weight,
                RentalStartDateUtc = null,
                RentalEndDateUtc = null
            };

            await _orderItemRepository.InsertAsync(orderItem);

            return Ok(new
            {
                success = true,
                message = $"Added product {product.Name} x {request.Quantity} to order {order.Id}"
            });
        }
    }
}
