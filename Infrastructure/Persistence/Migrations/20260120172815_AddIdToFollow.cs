using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIdToFollow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "Follows",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ModerationActions_ActorId",
                table: "ModerationActions",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_Interactions_UserId",
                table: "Interactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_FolloweeId",
                table: "Follows",
                column: "FolloweeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Follows_Users_FolloweeId",
                table: "Follows",
                column: "FolloweeId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Follows_Users_FollowerId",
                table: "Follows",
                column: "FollowerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Interactions_Posts_PostId",
                table: "Interactions",
                column: "PostId",
                principalTable: "Posts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Interactions_Users_UserId",
                table: "Interactions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ModerationActions_Posts_PostId",
                table: "ModerationActions",
                column: "PostId",
                principalTable: "Posts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ModerationActions_Users_ActorId",
                table: "ModerationActions",
                column: "ActorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                table: "Users",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Follows_Users_FolloweeId",
                table: "Follows");

            migrationBuilder.DropForeignKey(
                name: "FK_Follows_Users_FollowerId",
                table: "Follows");

            migrationBuilder.DropForeignKey(
                name: "FK_Interactions_Posts_PostId",
                table: "Interactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Interactions_Users_UserId",
                table: "Interactions");

            migrationBuilder.DropForeignKey(
                name: "FK_ModerationActions_Posts_PostId",
                table: "ModerationActions");

            migrationBuilder.DropForeignKey(
                name: "FK_ModerationActions_Users_ActorId",
                table: "ModerationActions");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_ModerationActions_ActorId",
                table: "ModerationActions");

            migrationBuilder.DropIndex(
                name: "IX_Interactions_UserId",
                table: "Interactions");

            migrationBuilder.DropIndex(
                name: "IX_Follows_FolloweeId",
                table: "Follows");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "Follows");
        }
    }
}
