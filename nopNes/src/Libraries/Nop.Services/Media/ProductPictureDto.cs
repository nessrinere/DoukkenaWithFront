using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Nop.Services.Media
{
    public class ProductPictureDto
    {
        public int ProductPictureId { get; set; } // From ProductPicture.Id
        public int PictureId { get; set; }        // From mapping.PictureId
        public string SeoFilename { get; set; }
        public string MimeType { get; set; }
        // Add other fields as needed
    }
}
