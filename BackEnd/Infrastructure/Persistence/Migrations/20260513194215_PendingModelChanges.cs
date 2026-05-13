using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDraft",
                table: "Posts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "TaskId",
                table: "Posts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Posts_TaskId",
                table: "Posts",
                column: "TaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_OrganizationTasks_TaskId",
                table: "Posts",
                column: "TaskId",
                principalTable: "OrganizationTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_OrganizationTasks_TaskId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_TaskId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "IsDraft",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "TaskId",
                table: "Posts");
        }
    }
}
