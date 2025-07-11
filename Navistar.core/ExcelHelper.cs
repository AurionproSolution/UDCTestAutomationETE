using ClosedXML.Excel;

public static class ExcelHelper
{
    private static readonly object _eh_lock = new();

    private static readonly Dictionary<string, Dictionary<string, string>> _eh_scenarioResults = new();
    private static readonly HashSet<string> _eh_allStepNames = new();

    private static string _eh_project = "Navistar";
    private static string _eh_feature = "DefaultFeature";

    public static void SetProjectAndFeature(string project, string feature)
    {
        _eh_project = SanitizeFileName(project);
        _eh_feature = SanitizeFileName(feature);
    }

    public static void LogStepResult(string scenarioWithData, string step, string status)
    {
        lock (_eh_lock)
        {
            if (!_eh_scenarioResults.ContainsKey(scenarioWithData))
                _eh_scenarioResults[scenarioWithData] = new Dictionary<string, string>();

            _eh_scenarioResults[scenarioWithData][step] = status;
            _eh_allStepNames.Add(step);
        }
    }

    public static void FlushToExcel()
    {
        lock (_eh_lock)
        {
            string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
            string folderPath = Path.Combine(baseDirectory, "ExcelResults");
            Directory.CreateDirectory(folderPath); // Ensure folder exists

            string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            string fileName = $"{_eh_project}_{_eh_feature}_{timestamp}.xlsx";
            string filePath = Path.Combine(folderPath, fileName);

            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Results");

                // Header row
                worksheet.Cell(1, 1).Value = "Scenario Name";
                var stepList = _eh_allStepNames.ToList();
                for (int i = 0; i < stepList.Count; i++)
                {
                    worksheet.Cell(1, i + 2).Value = stepList[i];
                }

                // Data rows
                int row = 2;
                foreach (var scenario in _eh_scenarioResults.Keys)
                {
                    worksheet.Cell(row, 1).Value = scenario;
                    var stepResults = _eh_scenarioResults[scenario];
                    for (int i = 0; i < stepList.Count; i++)
                    {
                        string step = stepList[i];
                        worksheet.Cell(row, i + 2).Value = stepResults.ContainsKey(step) ? stepResults[step] : "";
                    }
                    row++;
                }

                worksheet.Columns().AdjustToContents();
                workbook.SaveAs(filePath);
            }
        }
    }

    private static string SanitizeFileName(string input)
    {
        foreach (char c in Path.GetInvalidFileNameChars())
        {
            input = input.Replace(c, '_');
        }
        return input;
    }
}