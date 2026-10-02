using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoctorCrm.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CustomerStatuses : Migration
    {
        /// <summary>
        /// Statuses replace stages: Interested, Follow-up, Customer, Lost (spec change, Oct 2026).
        /// Where a customer is with consultations is no longer a stage (it is worked out from
        /// bookings), so Booked customers go back to Interested and Consultation Completed,
        /// Treatment Started and Completed become Customer. Statuses admins added are untouched.
        /// A fresh database has no stages yet: the seeder adds the new list.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                DECLARE cust integer; interested integer;
                BEGIN
                  IF NOT EXISTS (SELECT 1 FROM stages) THEN RETURN; END IF;

                  SELECT id INTO cust FROM stages WHERE system_key = 'customer';
                  IF cust IS NULL THEN SELECT id INTO cust FROM stages WHERE lower(name) = 'customer' AND system_key IS NULL ORDER BY id LIMIT 1; END IF;
                  IF cust IS NULL THEN
                    SELECT id INTO cust FROM stages WHERE system_key = 'completed';
                    UPDATE stages SET name = 'Customer' WHERE id = cust;
                  END IF;
                  IF cust IS NULL THEN
                    INSERT INTO stages (name, system_key, color, display_order, is_active, created_at, updated_at)
                    VALUES ('Customer', 'customer', '#22C55E', 3, true, now(), now()) RETURNING id INTO cust;
                  END IF;
                  UPDATE stages SET system_key = 'customer', is_active = true, updated_at = now() WHERE id = cust;

                  SELECT id INTO interested FROM stages WHERE system_key = 'interested';
                  UPDATE customers SET stage_id = interested
                    WHERE stage_id IN (SELECT id FROM stages WHERE system_key = 'booked');
                  UPDATE customers SET stage_id = cust
                    WHERE stage_id IN (SELECT id FROM stages WHERE system_key IN ('consultation_completed', 'treatment_started', 'completed') AND id <> cust);
                  DELETE FROM stages WHERE system_key IN ('booked', 'consultation_completed', 'treatment_started', 'completed') AND id <> cust;

                  UPDATE stages SET display_order = CASE system_key
                      WHEN 'interested' THEN 1 WHEN 'follow_up' THEN 2 WHEN 'customer' THEN 3 WHEN 'lost' THEN 4 END
                    WHERE system_key IN ('interested', 'follow_up', 'customer', 'lost');
                END $$;
                """);
        }

        /// <summary>Not reversible: which customers were Booked or Treatment Started is not kept.</summary>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
