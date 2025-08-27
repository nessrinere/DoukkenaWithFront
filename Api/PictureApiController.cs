using Microsoft.AspNetCore.Mvc;
using Nop.Services.Media;

[Route("api/pictures")]
[ApiController]
public class PictureApiController : ControllerBase
{
    private readonly IPictureService _pictureService;

    public PictureApiController(IPictureService pictureService)
    {
        _pictureService = pictureService;
    }

    [HttpGet("by-product/{productId}")]
    public async Task<IActionResult> GetPictureByProductId(int productId)
    {
        var picture = await _pictureService.GetFirstPictureByProductIdAsync(productId);
        if (picture == null)
            return NotFound();

        return Ok(new
        {
            picture.PictureId,
            picture.SeoFilename,
            picture.MimeType
        });
    }
}
