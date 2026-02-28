using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record CreatePostRequest(string Title, string Content, List<string> Tags);
}
