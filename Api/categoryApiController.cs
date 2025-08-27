using Microsoft.AspNetCore.Mvc;
using Nop.Services.Catalog;
using Nop.Services.Media;

[Route("api/categories")]
[ApiController]
public class CategoryApiController : ControllerBase
{
    private readonly ICategoryService _categoryService;
    private readonly IPictureService _pictureService;
    public CategoryApiController(ICategoryService categoryService, IPictureService pictureService)
    {
        _categoryService = categoryService;
        _pictureService = pictureService;
    }

    [HttpGet("homeV")]
    public async Task<IActionResult> GetCategoriesDisplayedOnHomepage()
    {
        var categories = await _categoryService.GetAllCategoriesDisplayedOnHomepageAsync();

        var catfromdata = await _categoryService.GetAllCategoriesAsync();
        var childrenGroupedByParent = catfromdata
            .Where(c => c.ParentCategoryId > 0)
            .GroupBy(c => c.ParentCategoryId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var rootCategories = categories
            .Where(c => c.ParentCategoryId == 0)
            .ToList();
       

        var result = rootCategories.Select(parent => new
        {
            parent.Id,
            parent.Name,
            parent.Description,
            parent.PictureId,
            Children = childrenGroupedByParent.ContainsKey(parent.Id)
                ? childrenGroupedByParent[parent.Id]
                    .Select(child => new
                    {
                        child.Id,
                        child.Name,
                        child.Description,
                        child.PictureId
                    })
                    .Cast<object>()
                    .ToList()
                : new List<object>()
        });

        return Ok(result);
    }
    [HttpGet("with-images")]
    public async Task<IActionResult> GetCategoriesWithImages()
    {
        try
        {
            // You can replace this with any category-loading logic, like only homepage ones
            var categories = await _categoryService.GetAllCategoriesAsync(showHidden: false);

            var result = new List<object>();

            foreach (var category in categories)
            {
                string imageUrl = null;

                if (category.PictureId > 0)
                {
                    var picture = await _pictureService.GetPictureByIdAsync(category.PictureId);
                    if (picture != null)
                    {
                        imageUrl = await _pictureService.GetPictureUrlAsync(picture.Id);
                    }
                }


                result.Add(new
                {
                    category.Id,
                    category.Name,
                    category.Description,
                    PictureId = category.PictureId,
                    ImageUrl = imageUrl
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching categories.", error = ex.Message });
        }
    }

}