// Общий код лаунчера и установщика GOD OF GRIMERKA (C# 5, .NET Framework 4.x — есть в любой Windows 10/11).
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Grimerka
{
    static class App
    {
        public const string Name = "GOD OF GRIMERKA";
        public const string Version = "1.2";
        public const string ExeName = "GOD OF GRIMERKA.exe";
        public const string Marker = "grimerka.installed";
        public const string RegKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\GOD OF GRIMERKA";

        static string Local { get { return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData); } }
        public static string DefaultDir { get { return Path.Combine(Path.Combine(Local, "Programs"), Name); } }
        // профиль браузера с сохранениями — отдельно от папки игры, чтобы переустановка их не трогала
        public static string DataDir { get { return Path.Combine(Local, Name); } }
        public static string DesktopLnk { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), Name + ".lnk"); } }
        public static string StartLnk { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), Name + ".lnk"); } }

        public static bool Has(string[] a, string flag)
        {
            foreach (string x in a) if (string.Equals(x, flag, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }

        public static string Arg(string[] a, string prefix)
        {
            foreach (string x in a) if (x.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return x.Substring(prefix.Length).Trim('"');
            return null;
        }

        // путь из /D=: в кавычках или без (как в NSIS — до следующего ключа или до конца строки), пробелы допустимы
        public static string DirArg()
        {
            string cl = Environment.CommandLine;
            int i = cl.IndexOf("/D=", StringComparison.OrdinalIgnoreCase);
            if (i < 0) return null;
            string rest = cl.Substring(i + 3);
            if (rest.StartsWith("\""))
            {
                int j = rest.IndexOf('"', 1);
                return j > 0 ? rest.Substring(1, j - 1) : rest.Substring(1);
            }
            int k = rest.IndexOf(" /");
            if (k >= 0) rest = rest.Substring(0, k);
            return rest.Trim().Trim('"');
        }

        public static void Shortcut(string lnk, string target, string dir)
        {
            Type t = Type.GetTypeFromProgID("WScript.Shell");
            object sh = Activator.CreateInstance(t);
            object l = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
            Type lt = l.GetType();
            lt.InvokeMember("TargetPath", BindingFlags.SetProperty, null, l, new object[] { target });
            lt.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, l, new object[] { dir });
            lt.InvokeMember("IconLocation", BindingFlags.SetProperty, null, l, new object[] { target + ",0" });
            lt.InvokeMember("Description", BindingFlags.SetProperty, null, l, new object[] { "Фанатский экшен про русский SoundCloud-рэп" });
            lt.InvokeMember("Save", BindingFlags.InvokeMethod, null, l, null);
        }

        // запись в «Приложения» Windows (только для текущего пользователя, без прав администратора)
        public static void Register(string dir, long kb)
        {
            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(RegKey))
            {
                string exe = Path.Combine(dir, ExeName);
                k.SetValue("DisplayName", Name);
                k.SetValue("DisplayVersion", Version);
                k.SetValue("Publisher", "Фанатский проект");
                k.SetValue("DisplayIcon", exe + ",0");
                k.SetValue("InstallLocation", dir);
                k.SetValue("UninstallString", "\"" + exe + "\" /uninstall");
                k.SetValue("QuietUninstallString", "\"" + exe + "\" /uninstall /S");
                k.SetValue("URLInfoAbout", "https://github.com/jelos8vetoi/god-of-grimerka");
                k.SetValue("EstimatedSize", (int)kb, RegistryValueKind.DWord);
                k.SetValue("NoModify", 1, RegistryValueKind.DWord);
                k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            }
        }

        public static void Unregister()
        {
            try { Registry.CurrentUser.DeleteSubKeyTree(RegKey, false); } catch { }
        }

        public static bool Installed()
        {
            using (RegistryKey k = Registry.CurrentUser.OpenSubKey(RegKey)) return k != null;
        }

        // Edge есть в любой Windows 10/11; если его нет — Chrome или Brave
        public static string FindBrowser()
        {
            foreach (string e in new string[] { "msedge.exe", "chrome.exe", "brave.exe" })
                foreach (RegistryKey hive in new RegistryKey[] { Registry.CurrentUser, Registry.LocalMachine })
                    using (RegistryKey k = hive.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\App Paths\" + e))
                    {
                        if (k == null) continue;
                        string p = k.GetValue("") as string;
                        if (!string.IsNullOrEmpty(p) && File.Exists(p.Trim('"'))) return p.Trim('"');
                    }
            string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)") ?? "", pf = Environment.GetEnvironmentVariable("ProgramFiles") ?? "";
            foreach (string p in new string[] {
                Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"), Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Local, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe") })
                if (File.Exists(p)) return p;
            return null;
        }

        public static void TryDel(string f)
        {
            try { if (File.Exists(f)) File.Delete(f); } catch { }
        }
    }

    static class Uninstall
    {
        // /uninstall [/S] [/D=папка] [/purge] [/noshortcuts] [/noreg]
        public static int Run(string[] a)
        {
            bool silent = App.Has(a, "/S");
            string dir = (App.DirArg() ?? AppDomain.CurrentDomain.BaseDirectory).TrimEnd('\\');
            // защита: удаляем только папку, в которой лежит наш маркер установки
            if (!File.Exists(Path.Combine(dir, App.Marker)))
            {
                if (!silent) MessageBox.Show("Эта папка не похожа на установку GOD OF GRIMERKA — ничего не удалено.", App.Name, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return 2;
            }
            if (!silent && MessageBox.Show("Удалить GOD OF GRIMERKA с этого компьютера?", App.Name, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return 0;
            bool purge = App.Has(a, "/purge") || (!silent && MessageBox.Show("Удалить ещё и сохранения (прогресс игры)?\n\n«Нет» — сохранения останутся и подхватятся при повторной установке.", App.Name, MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes);

            if (!App.Has(a, "/noshortcuts")) { App.TryDel(App.DesktopLnk); App.TryDel(App.StartLnk); }
            if (!App.Has(a, "/noreg")) App.Unregister();
            try { Directory.Delete(Path.Combine(dir, "game"), true); } catch { }
            App.TryDel(Path.Combine(dir, App.Marker));
            if (purge) { try { Directory.Delete(App.DataDir, true); } catch { } }

            // сам exe удаляется после выхода; папка удаляется, только если осталась пустой
            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c ping 127.0.0.1 -n 3 > nul & del /f /q \"" + Path.Combine(dir, App.ExeName) + "\" & rmdir \"" + dir + "\"");
            psi.CreateNoWindow = true; psi.UseShellExecute = false; psi.WindowStyle = ProcessWindowStyle.Hidden;
            Process.Start(psi);
            if (!silent) MessageBox.Show("GOD OF GRIMERKA удалена." + (purge ? "" : "\nСохранения остались на месте."), App.Name, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 0;
        }
    }
}
