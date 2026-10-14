using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoctorCrm.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FollowUpTracking : Migration
    {
        /// <summary>
        /// Follow-up tracking (attempts and the last follow-up on each customer) and the link from a
        /// completed consultation to the booking made for its next treatment. Recent enquiries (the
        /// last 14 days) still Interested or in Follow-up, with nothing booked and no follow-up date,
        /// are put into today's follow-ups so none is missed; older leads are left as they are.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "follow_up_attempts",
                table: "customers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_follow_up_at",
                table: "customers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "next_booking_id",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_bookings_next_booking_id",
                table: "bookings",
                column: "next_booking_id");

            migrationBuilder.AddForeignKey(
                name: "fk_bookings_bookings_next_booking_id",
                table: "bookings",
                column: "next_booking_id",
                principalTable: "bookings",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                UPDATE customers c SET next_follow_up_date = (now() AT TIME ZONE 'Asia/Dubai')::date
                FROM stages s
                WHERE s.id = c.stage_id AND s.system_key IN ('interested', 'follow_up')
                  AND c.is_active AND c.next_follow_up_date IS NULL
                  AND c.created_at >= now() - interval '14 days'
                  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id AND b.status = 'Booked');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_bookings_bookings_next_booking_id",
                table: "bookings");

            migrationBuilder.DropIndex(
                name: "ix_bookings_next_booking_id",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "follow_up_attempts",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "last_follow_up_at",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "next_booking_id",
                table: "bookings");
        }
    }
}
