using DoctorCrm.Api.DTOs;
using FluentValidation;

namespace DoctorCrm.Api.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Please enter your username.")
            .MaximumLength(50).WithMessage("Usernames are at most 50 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Please enter your password.")
            .MaximumLength(200);
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Please enter your current password.")
            .MaximumLength(200);

        RuleFor(x => x.NewPassword)
            .Must(Rules.IsStrongPassword).WithMessage(Rules.PasswordMessage)
            .MaximumLength(200)
            .NotEqual(x => x.CurrentPassword).WithMessage("Choose a password different from your current one.");
    }
}
