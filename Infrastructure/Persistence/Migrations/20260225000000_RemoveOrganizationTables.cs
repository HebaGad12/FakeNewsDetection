using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOrganizationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop OrganizationWalletTransactions first (has FK to OrganizationWallets)
            migrationBuilder.DropTable(name: "OrganizationWalletTransactions");

            // Drop OrganizationWallets (has FK to Users)
            migrationBuilder.DropTable(name: "OrganizationWallets");

            // Drop OrganizationFollows (has FK to Users)
            migrationBuilder.DropTable(name: "OrganizationFollows");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizationFollows",
                columns: table => new
                {
                    FollowerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizationUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationFollows", x => new { x.FollowerId, x.OrganizationUserId });
                    table.ForeignKey(
                        name: "FK_OrganizationFollows_Users_FollowerId",
                        column: x => x.FollowerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrganizationFollows_Users_OrganizationUserId",
                        column: x => x.OrganizationUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationWallets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizationUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Balance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationWallets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationWallets_Users_OrganizationUserId",
                        column: x => x.OrganizationUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationWalletTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WalletId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationWalletTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationWalletTransactions_OrganizationWallets_WalletId",
                        column: x => x.WalletId,
                        principalTable: "OrganizationWallets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrganizationWalletTransactions_Users_ActorId",
                        column: x => x.ActorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationFollows_OrganizationUserId",
                table: "OrganizationFollows",
                column: "OrganizationUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationWallets_OrganizationUserId",
                table: "OrganizationWallets",
                column: "OrganizationUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationWalletTransactions_ActorId",
                table: "OrganizationWalletTransactions",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationWalletTransactions_WalletId",
                table: "OrganizationWalletTransactions",
                column: "WalletId");
        }
    }
}
