// FILE: BackEnd/Infrastructure/Presentation/Controllers/NewsSeederController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Presentation;

namespace Presentation.Controllers   // no extra using needed — same assembly
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class NewsSeederController : ControllerBase
    {
        private readonly NewsApiSeeder _seeder;

        public NewsSeederController(NewsApiSeeder seeder)
        {
            _seeder = seeder;
        }

        [HttpPost("seed-news")]
        public async Task<IActionResult> SeedNews()
        {
            await _seeder.SeedAsync();
            return Ok(new { Message = "News seeding completed." });
        }
    }
}