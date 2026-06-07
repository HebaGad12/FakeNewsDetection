using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class rec : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // All schema in this migration (IsDraft, TaskId, IX_Posts_TaskId,
            // FK_Posts_OrganizationTasks_TaskId) was already applied to the
            // database by a prior migration on the Frontend branch.
            // This migration is intentionally a no-op to allow EF Core to
            // record it as applied without duplicating existing schema.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: nothing was added in Up(), nothing to undo.
        }
    }
}
