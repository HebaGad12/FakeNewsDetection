using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record UserActivityResponse(
      Guid PostId,
      string ActionType,
      string Target,
      DateTime Timestamp
  );
}
