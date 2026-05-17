using System;
using System.Diagnostics;
using System.IO;

public static class Program
{
    public static void Main()
    {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string scriptPath = Path.Combine(exeDir, "scripts", "standalone-server.ps1");

        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "scripts", "standalone-server.ps1");
        }

        if (!File.Exists(scriptPath))
        {
            Console.WriteLine("standalone-server.ps1 파일을 찾을 수 없습니다.");
            Console.WriteLine("CoffeeOrderServer.exe를 프로젝트 루트 폴더에서 실행해 주세요.");
            Console.ReadLine();
            return;
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + scriptPath + "\"",
            UseShellExecute = false
        };

        Process.Start(startInfo).WaitForExit();
    }
}
