namespace ServiceGuide.Tests;

public sealed class WorkshopQaExerciseTests
{
    [Fact]
    public void FailureRequiresExplicitWorkshopOptIn()
    {
        string? selection = Environment.GetEnvironmentVariable("WORKSHOP_QA_DEMONSTRATE_FAILURE");
        Assert.True(selection is null or "" or "false" or "true",
            "WORKSHOP_QA_DEMONSTRATE_FAILURE must be unset, false, or true.");
        Assert.False(selection == "true",
            "Intentional workshop failure: WORKSHOP_QA_DEMONSTRATE_FAILURE=true. " +
            "Rerun Workshop QA with demonstrate_failure=false. This is not an application defect.");
    }
}
