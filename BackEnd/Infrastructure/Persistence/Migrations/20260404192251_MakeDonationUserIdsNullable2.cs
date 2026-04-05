using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeDonationUserIdsNullable2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Donations_Users_RecipientId",
                table: "Donations");

            migrationBuilder.DropForeignKey(
                name: "FK_Donations_Users_SenderId",
                table: "Donations");

            migrationBuilder.AddForeignKey(
                name: "FK_Donations_Users_RecipientId",
                table: "Donations",
                column: "RecipientId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Donations_Users_SenderId",
                table: "Donations",
                column: "SenderId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Donations_Users_RecipientId",
                table: "Donations");

            migrationBuilder.DropForeignKey(
                name: "FK_Donations_Users_SenderId",
                table: "Donations");

            migrationBuilder.AddForeignKey(
                name: "FK_Donations_Users_RecipientId",
                table: "Donations",
                column: "RecipientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Donations_Users_SenderId",
                table: "Donations",
                column: "SenderId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
