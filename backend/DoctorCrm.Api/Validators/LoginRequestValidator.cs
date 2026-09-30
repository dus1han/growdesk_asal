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
