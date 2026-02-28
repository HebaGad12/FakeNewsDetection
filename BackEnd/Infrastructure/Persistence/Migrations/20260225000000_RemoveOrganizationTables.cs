using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <summary>
    /// Drops the three organization-specific tables that are now redundant:
    ///   OrganizationFollows       → use Follows table
    ///   OrganizationWallets       → use Wallets table
    ///   OrganizationWalletTransactions → use WalletTransactions table
    ///
    /// Each DROP uses IF EXISTS so the migration is safe to run when the tables
    /// are already absent (e.g. fresh database).
    /// </summary>
    public partial class RemoveOrganizationTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop child table first (FK to OrganizationWallets)
            migrationBuilder.Sql(
                "IF OBJECT_ID('OrganizationWalletTransactions', 'U') IS NOT NULL " +
                "DROP TABLE [OrganizationWalletTransactions];");

            // Drop parent wallet table
            migrationBuilder.Sql(
                "IF OBJECT_ID('OrganizationWallets', 'U') IS NOT NULL " +
                "DROP TABLE [OrganizationWallets];");

            // Drop follows table
            migrationBuilder.Sql(
                "IF OBJECT_ID('OrganizationFollows', 'U') IS NOT NULL " +
                "DROP TABLE [OrganizationFollows];");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizationFollows",
                columns: table => new
                {
                    FollowerId          = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizationUserId  = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt           = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationFollows", x => new { x.FollowerId, x.OrganizationUserId });
                    table.ForeignKey("FK_OrganizationFollows_Users_FollowerId",       x => x.FollowerId,         "Users", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_OrganizationFollows_Users_OrganizationUserId", x => x.OrganizationUserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationWallets",
                columns: table => new
                {
                    Id                 = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizationUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Balance            = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt          = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt          = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationWallets", x => x.Id);
                    table.ForeignKey("FK_OrganizationWallets_Users_OrganizationUserId", x => x.OrganizationUserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationWalletTransactions",
                columns: table => new
                {
                    Id          = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WalletId    = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorId     = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount      = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Type        = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt   = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationWalletTransactions", x => x.Id);
                    table.ForeignKey("FK_OrganizationWalletTransactions_OrganizationWallets_WalletId", x => x.WalletId, "OrganizationWallets", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_OrganizationWalletTransactions_Users_ActorId",                x => x.ActorId,  "Users",               "Id", onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex("IX_OrganizationFollows_OrganizationUserId",       "OrganizationFollows",            "OrganizationUserId");
            migrationBuilder.CreateIndex("IX_OrganizationWallets_OrganizationUserId",        "OrganizationWallets",            "OrganizationUserId", unique: true);
            migrationBuilder.CreateIndex("IX_OrganizationWalletTransactions_ActorId",        "OrganizationWalletTransactions", "ActorId");
            migrationBuilder.CreateIndex("IX_OrganizationWalletTransactions_WalletId",       "OrganizationWalletTransactions", "WalletId");
        }
    }
}
