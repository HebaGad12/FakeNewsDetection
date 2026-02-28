using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record AuthResponse(string Token, Guid UserId, string Name, string Email, string Role);
}
