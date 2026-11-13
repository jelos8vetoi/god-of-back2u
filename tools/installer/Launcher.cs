// Лаунчер «GOD OF BACK2U.exe»: открывает игру в отдельном окне браузера (режим приложения, без адресной строки).
// Флаг /uninstall — удаление игры (его вызывает «Приложения» Windows).
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace Back2U
{
    static class Launcher
    {
        [STAThread]
        static int Main(string[] args)
        {
            if (App.Has(args, "/uninstall")) return Uninstall.Run(args);

            string dir = AppDomain.CurrentDomain.BaseDirectory;
            string html = Path.Combine(Path.Combine(dir, "game"), "index.html");
            if (!File.Exists(html))
            {
                MessageBox.Show("Файлы игры не найдены. Переустановите GOD OF BACK2U.", App.Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
            string url = new Uri(html).AbsoluteUri;
            string browser = App.FindBrowser();
            if (browser != null)
            {
                string profile = Path.Combine(App.DataDir, "Profile");
                Directory.CreateDirectory(profile);
                ProcessStartInfo psi = new ProcessStartInfo(browser,
                    "--app=\"" + url + "\" --user-data-dir=\"" + profile + "\" --no-first-run --no-default-browser-check " +
                    "--start-maximized --autoplay-policy=no-user-gesture-required --disable-features=Translate");
                psi.UseShellExecute = false;
                try { Process.Start(psi); return 0; } catch { }
            }
            // запасной вариант — браузер по умолчанию
            try
            {
                ProcessStartInfo p = new ProcessStartInfo(html);
                p.UseShellExecute = true;
                Process.Start(p);
                return 0;
            }
            catch (Exception e)
            {
                MessageBox.Show("Не удалось открыть игру: " + e.Message, App.Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
        }
    }
}
