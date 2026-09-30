using DoctorCrm.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoctorCrm.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Stage> Stages => Set<Stage>();
    public DbSet<Treatment> Treatments => Set<Treatment>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<LeadSource> LeadSources => Set<LeadSource>();
    public DbSet<CancellationReason> CancellationReasons => Set<CancellationReason>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<CustomField> CustomFields => Set<CustomField>();
    public DbSet<CustomFieldOption> CustomFieldOptions => Set<CustomFieldOption>();
    public DbSet<CaptureFieldConfiguration> CaptureFieldConfigurations => Set<CaptureFieldConfiguration>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Username).HasMaxLength(50).IsRequired();
            e.Property(x => x.NormalizedUsername).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.NormalizedUsername).IsUnique();
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.PasswordHash).HasMaxLength(100).IsRequired();
        });

        b.Entity<Role>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Description).HasMaxLength(250);
        });

        b.Entity<Permission>(e =>
        {
            e.Property(x => x.Key).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Description).HasMaxLength(250);
        });

        b.Entity<UserRole>(e =>
        {
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId);
        });

        b.Entity<RolePermission>(e =>
        {
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId);
            e.HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId);
        });

        b.Entity<Stage>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.SystemKey).HasMaxLength(50);
            e.HasIndex(x => x.SystemKey).IsUnique();
            e.Property(x => x.Color).HasMaxLength(9).IsRequired();
            e.HasIndex(x => x.DisplayOrder);
        });

        b.Entity<Treatment>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.HasIndex(x => x.DisplayOrder);
        });

        ConfigureSimpleLookup<LeadSource>(b);
        ConfigureSimpleLookup<CancellationReason>(b);
        ConfigureSimpleLookup<PaymentMethod>(b);

        b.Entity<CustomField>(e =>
        {
            e.Property(x => x.Key).HasMaxLength(60).IsRequired();
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Label).HasMaxLength(100).IsRequired();
            e.Property(x => x.FieldType).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.DisplayOrder);
            e.Ignore(x => x.HasOptions);
            e.HasMany(x => x.Options).WithOne(x => x.CustomField).HasForeignKey(x => x.CustomFieldId);
        });

        b.Entity<CustomFieldOption>(e =>
        {
            e.Property(x => x.Label).HasMaxLength(100).IsRequired();
            e.HasIndex(x => new { x.CustomFieldId, x.DisplayOrder });
        });

        b.Entity<CaptureFieldConfiguration>(e =>
        {
            e.Property(x => x.FieldKey).HasMaxLength(60).IsRequired();
            e.HasIndex(x => x.FieldKey).IsUnique();
            e.HasOne(x => x.CustomField).WithMany().HasForeignKey(x => x.CustomFieldId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<SystemSetting>(e =>
        {
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(100);
            e.Property(x => x.Value).HasMaxLength(2000).IsRequired();
        });

        b.Entity<AuditLog>(e =>
        {
            e.Property(x => x.Action).HasMaxLength(100).IsRequired();
            e.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
            e.Property(x => x.EntityId).HasMaxLength(100);
            e.Property(x => x.Metadata).HasColumnType("jsonb");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
        });
    }

    private static void ConfigureSimpleLookup<T>(ModelBuilder b) where T : class, ILookupEntity =>
        b.Entity<T>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.DisplayOrder);
        });

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
