# GrowDesk API: built on GitHub's runners, pulled and run on the VPS.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY DoctorCrm.Api/DoctorCrm.Api.csproj DoctorCrm.Api/
RUN dotnet restore DoctorCrm.Api/DoctorCrm.Api.csproj

COPY DoctorCrm.Api/ DoctorCrm.Api/
RUN dotnet publish DoctorCrm.Api/DoctorCrm.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    TZ=Asia/Dubai
COPY --from=build /app .
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "DoctorCrm.Api.dll"]
