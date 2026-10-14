using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoctorCrm.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PartPaymentsRecycleBinAndLeadSources : Migration
    {
        /// <summary>
        /// Brought over from the Marist clinic: part payments (each consultation keeps what was paid
        /// and the balance still owed, filled in here from the existing payment entries), the recycle
        /// bin (deleted records stay, hidden), built-in WhatsApp and Instagram lead sources for the
        /// capture toolbar (its lead source field is switched on), and Receptionist and Staff may
        /// complete consultations.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_treatments_name",
                table: "treatments");

            migrationBuilder.DropIndex(
                name: "ix_customers_instagram_name",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_customers_whats_app_number",
                table: "customers");

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "treatments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "treatments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "stages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "stages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "payments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "payments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "payment_methods",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "payment_methods",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "lead_sources",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "lead_sources",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_key",
                table: "lead_sources",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "customers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "customers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "cancellation_reasons",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "cancellation_reasons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "amount_paid",
                table: "bookings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "balance",
                table: "bookings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_id",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_treatments_name",
                table: "treatments",
                column: "name",
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_lead_sources_system_key",
                table: "lead_sources",
                column: "system_key",
                unique: true,
                filter: "system_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_customers_instagram_name",
                table: "customers",
                column: "instagram_name",
                unique: true,
                filter: "instagram_name IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_customers_whats_app_number",
                table: "customers",
                column: "whats_app_number",
                unique: true,
                filter: "whats_app_number IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_bookings_customer_id_balance",
                table: "bookings",
                columns: new[] { "customer_id", "balance" },
                filter: "balance > 0");

            migrationBuilder.Sql("""
                UPDATE bookings b SET
                    amount_paid = COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.status = 'Paid'), 0),
                    balance = CASE
                        WHEN b.status = 'Completed' AND b.consultation_charge IS NOT NULL THEN GREATEST(0,
                            b.consultation_charge
                            - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.status IN ('Paid', 'Waived')), 0))
                        ELSE 0 END;
                """);

            migrationBuilder.Sql("UPDATE capture_field_configurations SET is_enabled = TRUE WHERE field_key = 'lead_source';");

            migrationBuilder.Sql("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r CROSS JOIN permissions p
                WHERE r.name IN ('Receptionist', 'Staff') AND p.key = 'bookings.complete'
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_treatments_name",
                table: "treatments");

            migrationBuilder.DropIndex(
                name: "ix_lead_sources_system_key",
                table: "lead_sources");

            migrationBuilder.DropIndex(
                name: "ix_customers_instagram_name",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_customers_whats_app_number",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_bookings_customer_id_balance",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "treatments");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "treatments");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "stages");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "stages");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "payment_methods");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "payment_methods");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "lead_sources");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "lead_sources");

            migrationBuilder.DropColumn(
                name: "system_key",
                table: "lead_sources");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "cancellation_reasons");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "cancellation_reasons");

            migrationBuilder.DropColumn(
                name: "amount_paid",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "balance",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "deleted_by_id",
                table: "bookings");

            migrationBuilder.CreateIndex(
                name: "ix_treatments_name",
                table: "treatments",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customers_instagram_name",
                table: "customers",
                column: "instagram_name",
                unique: true,
                filter: "instagram_name IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_customers_whats_app_number",
                table: "customers",
                column: "whats_app_number",
                unique: true,
                filter: "whats_app_number IS NOT NULL");
        }
    }
}
