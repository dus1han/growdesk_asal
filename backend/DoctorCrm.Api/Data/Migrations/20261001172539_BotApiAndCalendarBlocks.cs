using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DoctorCrm.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BotApiAndCalendarBlocks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "kind",
                table: "capture_clients",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Toolbar"); // connections made before bots existed are toolbars

            migrationBuilder.AddColumn<string>(
                name: "source",
                table: "bookings",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "calendar_blocks",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    end_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_by_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_calendar_blocks", x => x.id);
                    table.ForeignKey(
                        name: "fk_calendar_blocks_users_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_calendar_blocks_created_by_id",
                table: "calendar_blocks",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_calendar_blocks_start_date_end_date",
                table: "calendar_blocks",
                columns: new[] { "start_date", "end_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "calendar_blocks");

            migrationBuilder.DropColumn(
                name: "kind",
                table: "capture_clients");

            migrationBuilder.DropColumn(
                name: "source",
                table: "bookings");
        }
    }
}
