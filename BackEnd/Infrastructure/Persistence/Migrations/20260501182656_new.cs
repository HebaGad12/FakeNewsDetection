using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class @new : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Communities_CreatedBy",
                table: "Communities",
                column: "CreatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_Communities_Users_CreatedBy",
                table: "Communities",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Communities_Users_CreatedBy",
                table: "Communities");

            migrationBuilder.DropIndex(
                name: "IX_Communities_CreatedBy",
                table: "Communities");
        }
    }
}
