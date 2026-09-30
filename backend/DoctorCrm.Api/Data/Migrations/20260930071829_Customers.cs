using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DoctorCrm.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Customers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    whats_app_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    secondary_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    instagram_name = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    stage_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_user_id = table.Column<int>(type: "integer", nullable: true),
                    lead_source_id = table.Column<int>(type: "integer", nullable: true),
                    last_contact_date = table.Column<DateOnly>(type: "date", nullable: true),
                    next_follow_up_date = table.Column<DateOnly>(type: "date", nullable: true),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customers", x => x.id);
                    table.ForeignKey(
                        name: "fk_customers_lead_sources_lead_source_id",
                        column: x => x.lead_source_id,
                        principalTable: "lead_sources",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customers_stages_stage_id",
                        column: x => x.stage_id,
                        principalTable: "stages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customers_users_assigned_user_id",
                        column: x => x.assigned_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "customer_custom_field_values",
                columns: table => new
                {
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    custom_field_id = table.Column<int>(type: "integer", nullable: false),
                    value = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_custom_field_values", x => new { x.customer_id, x.custom_field_id });
                    table.ForeignKey(
                        name: "fk_customer_custom_field_values_custom_fields_custom_field_id",
                        column: x => x.custom_field_id,
                        principalTable: "custom_fields",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_custom_field_values_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "customer_treatments",
                columns: table => new
                {
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    treatment_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_treatments", x => new { x.customer_id, x.treatment_id });
                    table.ForeignKey(
                        name: "fk_customer_treatments_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_customer_treatments_treatments_treatment_id",
                        column: x => x.treatment_id,
                        principalTable: "treatments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_customer_custom_field_values_custom_field_id",
                table: "customer_custom_field_values",
                column: "custom_field_id");

            migrationBuilder.CreateIndex(
                name: "ix_customer_treatments_treatment_id",
                table: "customer_treatments",
                column: "treatment_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_assigned_user_id",
                table: "customers",
                column: "assigned_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_created_at",
                table: "customers",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_customers_instagram_name",
                table: "customers",
                column: "instagram_name",
                unique: true,
                filter: "instagram_name IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_customers_lead_source_id",
                table: "customers",
                column: "lead_source_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_next_follow_up_date",
                table: "customers",
                column: "next_follow_up_date");

            migrationBuilder.CreateIndex(
                name: "ix_customers_stage_id",
                table: "customers",
                column: "stage_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_whats_app_number",
                table: "customers",
                column: "whats_app_number",
                unique: true,
                filter: "whats_app_number IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_custom_field_values");

            migrationBuilder.DropTable(
                name: "customer_treatments");

            migrationBuilder.DropTable(
                name: "customers");
        }
    }
}
