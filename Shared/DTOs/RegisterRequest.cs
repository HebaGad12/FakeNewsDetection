using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record RegisterRequest(string Name, string Email, string Password, Role Role, Guid? OrganizationId, string? JournalistId);
}
