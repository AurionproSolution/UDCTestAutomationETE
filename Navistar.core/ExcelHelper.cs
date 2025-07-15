using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

public static class ExcelHelper
{
    private static readonly object _eh_lock = new();

    private static readonly Dictionary<string, Dictionary<string, Dictionary<string, string>>> _eh_featureScenarioResults = new();
    private static readonly Dictionary<string, HashSet<string>> _eh_featureStepNames = new();

    private static string _eh_project = "Navistar";
    private static string _eh_currentFeature = "DefaultFeature";

    public static void SetProjectAndFeature(string project, string feature)
    {
        _eh_project = SanitizeFileName(project);
        _eh_currentFeature = SanitizeFileName(feature);

        lock (_eh_lock)
        {
            if (!_eh_featureScenarioResults.ContainsKey(_eh_currentFeature))
                _eh_featureScenarioResults[_eh_currentFeature] = new Dictionary<string, Dictionary<string, string>>();

            if (!_eh_featureStepNames.ContainsKey(_eh_currentFeature))
                _eh_featureStepNames[_eh_currentFeature] = new HashSet<string>();
        }
    }

    public static void LogStepResult(string scenario, string step, string status)
    {
        lock (_eh_lock)
        {
            if (!_eh_featureScenarioResults.ContainsKey(_eh_currentFeature))
                _eh_featureScenarioResults[_eh_currentFeature] = new Dictionary<string, Dictionary<string, string>>();

            if (!_eh_featureScenarioResults[_eh_currentFeature].ContainsKey(scenario))
                _eh_featureScenarioResults[_eh_currentFeature][scenario] = new Dictionary<string, string>();

            _eh_featureScenarioResults[_eh_currentFeature][scenario][step] = status;
            _eh_featureStepNames[_eh_currentFeature].Add(step);
        }
    }

    public static void FlushCurrentFeatureToExcel()
    {
        lock (_eh_lock)
        {
            if (!_eh_featureScenarioResults.ContainsKey(_eh_currentFeature)) return;

            string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
            string folderPath = Path.Combine(baseDirectory, "ExcelResults");
            Directory.CreateDirectory(folderPath);

            string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            string fileName = $"{_eh_project}_{_eh_currentFeature}_{timestamp}.xlsx";
            string filePath = Path.Combine(folderPath, fileName);

            var scenarioResults = _eh_featureScenarioResults[_eh_currentFeature];
            var stepList = _eh_featureStepNames[_eh_currentFeature].ToList();

            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Results");

                worksheet.Cell(1, 1).Value = "Scenario Name";
                for (int i = 0; i < stepList.Count; i++)
                {
                    worksheet.Cell(1, i + 2).Value = stepList[i];
                }

                int row = 2;
                foreach (var scenario in scenarioResults.Keys)
                {
                    worksheet.Cell(row, 1).Value = scenario;
                    var steps = scenarioResults[scenario];
                    for (int i = 0; i < stepList.Count; i++)
                    {
                        var step = stepList[i];
                        worksheet.Cell(row, i + 2).Value = steps.ContainsKey(step) ? steps[step] : "";
                    }
                    row++;
                }

                worksheet.Columns().AdjustToContents();
                workbook.SaveAs(filePath);
            }

            _eh_featureScenarioResults.Remove(_eh_currentFeature);
            _eh_featureStepNames.Remove(_eh_currentFeature);
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
