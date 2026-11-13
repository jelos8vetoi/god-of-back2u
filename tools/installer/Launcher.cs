// Лаунчер «GOD OF GRIMERKA.exe»: своё окно в стиле игры — арт, «ИГРАТЬ», настройки графики, что нового.
// Игру открывает в отдельном окне браузера (режим приложения, без адресной строки) и передаёт ей настройки.
// Ключи: /play — сразу запустить игру без окна, /uninstall — удаление, /shot=файл.png — снимок окна (для проверки).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Grimerka
{
    static class Launcher
    {
        [STAThread]
        static int Main(string[] args)
        {
            if (App.Has(args, "/uninstall")) return Uninstall.Run(args);
            if (App.Has(args, "/play")) return Game.Start(Settings.Load()) ? 0 : 1;
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            LauncherForm f = new LauncherForm();
            string shot = App.Arg(args, "/shot=");
            if (shot != null) { f.Show(); Application.DoEvents(); f.Hover = App.Has(args, "/hover") ? "play" : null; f.Shot(shot); return 0; }
            Application.Run(f);
            return 0;
        }
    }

    class Settings
    {
        public string Q = "auto"; public bool Full = true; public bool Fps = false;
        static string F { get { return Path.Combine(App.DataDir, "launcher.ini"); } }
        public static Settings Load()
        {
            Settings s = new Settings();
            try
            {
                foreach (string l in File.ReadAllLines(F))
                {
                    string[] p = l.Split(new char[] { '=' }, 2); if (p.Length < 2) continue;
                    if (p[0] == "quality" && Array.IndexOf(new string[] { "auto", "lo", "mid", "hi" }, p[1]) >= 0) s.Q = p[1];
                    else if (p[0] == "fullscreen") s.Full = p[1] == "1";
                    else if (p[0] == "fps") s.Fps = p[1] == "1";
                }
            }
            catch { }
            return s;
        }
        public void Save()
        {
            try { Directory.CreateDirectory(App.DataDir); File.WriteAllLines(F, new string[] { "quality=" + Q, "fullscreen=" + (Full ? "1" : "0"), "fps=" + (Fps ? "1" : "0") }); } catch { }
        }
    }

    static class Game
    {
        public static string Dir { get { return AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\'); } }
        public static bool Start(Settings s)
        {
            string html = Path.Combine(Path.Combine(Dir, "game"), "index.html");
            if (!File.Exists(html))
            {
                MessageBox.Show("Файлы игры не найдены. Переустановите GOD OF GRIMERKA.", App.Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return false;
            }
            string url = new Uri(html).AbsoluteUri + "?q=" + s.Q + "&fps=" + (s.Fps ? "1" : "0");
            string browser = App.FindBrowser();
            if (browser != null)
            {
                string profile = Path.Combine(App.DataDir, "Profile");
                Directory.CreateDirectory(profile);
                // --ignore-gpu-blocklist: WebGL идёт через видеокарту даже на драйверах из «чёрного списка» — иначе браузер рисует процессором
                ProcessStartInfo psi = new ProcessStartInfo(browser,
                    "--app=\"" + url + "\" --user-data-dir=\"" + profile + "\" --no-first-run --no-default-browser-check " +
                    (s.Full ? "--start-fullscreen " : "--start-maximized ") +
                    "--autoplay-policy=no-user-gesture-required --ignore-gpu-blocklist --enable-gpu-rasterization --disable-features=Translate");
                psi.UseShellExecute = false;
                try { Process.Start(psi); return true; } catch { }
            }
            try { ProcessStartInfo p = new ProcessStartInfo(url); p.UseShellExecute = true; Process.Start(p); return true; }
            catch (Exception e) { MessageBox.Show("Не удалось открыть игру: " + e.Message, App.Name, MessageBoxButtons.OK, MessageBoxIcon.Error); return false; }
        }
    }

    class LauncherForm : Form
    {
        const int LW = 960, LH = 620;
        static readonly Color RED = Color.FromArgb(255, 59, 59), TXT = Color.FromArgb(236, 240, 248), DIM = Color.FromArgb(150, 160, 180),
            PANEL = Color.FromArgb(200, 18, 21, 30), LINE = Color.FromArgb(70, 78, 98), GOLD = Color.FromArgb(255, 210, 59);
        static readonly string[][] QUAL = { new string[] { "auto", "Авто" }, new string[] { "lo", "Низкая" }, new string[] { "mid", "Средняя" }, new string[] { "hi", "Высокая" } };
        static readonly Dictionary<string, string> QHINT = new Dictionary<string, string> {
            { "auto", "Держит 60 FPS: на слабой видеокарте само снижает разрешение и эффекты, на сильной возвращает." },
            { "lo", "Без теней и свечения, пониженное разрешение. Для слабых ноутбуков." },
            { "mid", "Тени есть, свечения нет. Хороший баланс для встроенной графики." },
            { "hi", "Тени, свечение, сглаживание — максимум красоты." } };
        const string NEWS = "НОВОЕ В 1.2   ●   теперь это GOD OF GRIMERKA   ●   герой — Пахан   ●   настоящие перекаты на пробел   ●   полный экран на F11   ●   переназначение клавиш в настройках   ●   9 глав, 9 боссов, 15 NPC, секреты, NG+   ●   ";

        float S = 1f; Image art, icon; FontFamily ru; Settings set; Timer tick; float t, newsX;
        public string Hover; Dictionary<string, RectangleF> hits = new Dictionary<string, RectangleF>();
        List<float[]> embers = new List<float[]>(); Random rnd = new Random(7);

        public LauncherForm()
        {
            set = Settings.Load();
            Text = App.Name; FormBorderStyle = FormBorderStyle.None; StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(6, 6, 10); DoubleBuffered = true; KeyPreview = true;
            using (Graphics g = CreateGraphics()) S = g.DpiX / 96f;
            ClientSize = new Size((int)(LW * S), (int)(LH * S));
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            art = Img("keyart.jpg"); icon = Img("icon.png");
            try
            {
                byte[] fb = Bytes("font.ttf"); PrivateFontCollection pfc = new PrivateFontCollection();
                IntPtr p = Marshal.AllocCoTaskMem(fb.Length); Marshal.Copy(fb, 0, p, fb.Length); pfc.AddMemoryFont(p, fb.Length); ru = pfc.Families[0];
            }
            catch { ru = new FontFamily("Segoe UI"); }
            for (int i = 0; i < 46; i++) embers.Add(NewEmber(true));
            tick = new Timer(); tick.Interval = 33; tick.Tick += delegate { Step(0.033f); Invalidate(); }; tick.Start();
            KeyDown += delegate (object s, KeyEventArgs e) { if (e.KeyCode == Keys.Enter || e.KeyCode == Keys.Space) Play(); else if (e.KeyCode == Keys.Escape) Close(); };
        }

        static Stream Res(string n) { return Assembly.GetExecutingAssembly().GetManifestResourceStream(n); }
        static byte[] Bytes(string n) { using (Stream s = Res(n)) { MemoryStream ms = new MemoryStream(); s.CopyTo(ms); return ms.ToArray(); } }
        static Image Img(string n) { return Image.FromStream(new MemoryStream(Bytes(n))); }

        float[] NewEmber(bool any)
        {   // x, y, скорость, размер, фаза
            return new float[] { 470 + (float)rnd.NextDouble() * 490, any ? (float)rnd.NextDouble() * LH : LH + 10, 14 + (float)rnd.NextDouble() * 34, 1.2f + (float)rnd.NextDouble() * 2.6f, (float)rnd.NextDouble() * 6.3f };
        }

        void Step(float dt)
        {
            t += dt; newsX -= 46 * dt;
            for (int i = 0; i < embers.Count; i++)
            {
                float[] e = embers[i]; e[1] -= e[2] * dt; e[0] += (float)Math.Sin(t * 1.3 + e[4]) * 9 * dt;
                if (e[1] < -10) embers[i] = NewEmber(false);
            }
        }

        // ---------- рисование ----------
        protected override CreateParams CreateParams { get { CreateParams cp = base.CreateParams; cp.ClassStyle |= 0x20000; return cp; } } // тень окна

        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int val, int size);
        [DllImport("user32.dll")] static extern bool ReleaseCapture();
        [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, IntPtr l);
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            int round = 2; try { DwmSetWindowAttribute(Handle, 33, ref round, 4); } catch { }   // скруглённые углы Windows 11
        }

        static GraphicsPath Round(RectangleF r, float rad)
        {
            GraphicsPath p = new GraphicsPath(); float d = rad * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90); p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure();
            return p;
        }

        void Txt(Graphics g, string s, Font f, Color c, float x, float y)
        {
            using (SolidBrush b = new SolidBrush(c)) g.DrawString(s, f, b, x, y, StringFormat.GenericTypographic);
        }

        float Wd(Graphics g, string s, Font f)
        {
            StringFormat sf = new StringFormat(StringFormat.GenericTypographic); sf.FormatFlags |= StringFormatFlags.MeasureTrailingSpaces;
            return g.MeasureString(s, f, 4000, sf).Width;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics; g.ScaleTransform(S, S);
            g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = TextRenderingHint.AntiAlias; g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            hits.Clear();

            // фон: кей-арт с лёгким «дыханием»
            float k = Math.Max((float)LW / art.Width, (float)LH / art.Height) * (1.015f + 0.008f * (float)Math.Sin(t * .5));
            g.DrawImage(art, 0, (LH - art.Height * k) / 2, art.Width * k, art.Height * k);

            // угольки
            foreach (float[] em in embers)
            {
                float a = Math.Max(0, Math.Min(1, em[1] / LH)) * (0.55f + 0.45f * (float)Math.Sin(t * 4 + em[4]));
                using (SolidBrush b = new SolidBrush(Color.FromArgb((int)(60 * a), 255, 90, 40))) g.FillEllipse(b, em[0] - em[3] * 2.4f, em[1] - em[3] * 2.4f, em[3] * 4.8f, em[3] * 4.8f);
                using (SolidBrush b = new SolidBrush(Color.FromArgb((int)(230 * a), 255, 170, 90))) g.FillEllipse(b, em[0] - em[3] / 2, em[1] - em[3] / 2, em[3], em[3]);
            }

            // верхняя полоса
            using (LinearGradientBrush lg = new LinearGradientBrush(new RectangleF(0, 0, LW, 40), Color.FromArgb(200, 4, 4, 8), Color.FromArgb(0, 4, 4, 8), 90f)) g.FillRectangle(lg, 0, 0, LW, 40);
            g.DrawImage(icon, 16, 9, 20, 20);
            using (Font f = new Font("Segoe UI Semibold", 12f, GraphicsUnit.Pixel)) Txt(g, "GOD OF GRIMERKA", f, DIM, 44, 12);
            TopBtn(g, "min", new RectangleF(LW - 92, 0, 46, 36), false);
            TopBtn(g, "close", new RectangleF(LW - 46, 0, 46, 36), true);

            // логотип со свечением
            using (Font f = new Font(ru, 44f, GraphicsUnit.Pixel))
            {
                Txt(g, "GOD ", f, Color.White, 54, 96);
                Txt(g, "OF", f, RED, 54 + Wd(g, "GOD ", f), 96);
            }
            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddString("GRIMERKA", ru, 0, 92f, new PointF(48, 142), StringFormat.GenericTypographic);
                float pulse = 0.5f + 0.5f * (float)Math.Sin(t * 1.6);
                for (int i = 6; i >= 1; i--) using (Pen pen = new Pen(Color.FromArgb((int)((10 + 8 * pulse) * (7 - i) / 2), 255, 40, 30), i * 5f)) { pen.LineJoin = LineJoin.Round; g.DrawPath(pen, p); }
                using (LinearGradientBrush lg = new LinearGradientBrush(new RectangleF(0, 150, 10, 90), Color.White, Color.FromArgb(255, 205, 195), 90f)) g.FillPath(lg, p);
            }
            using (Font f = new Font("Segoe UI", 16f, GraphicsUnit.Pixel)) Txt(g, "сага о Пахане, кенте и девяти серверах", f, DIM, 58, 256);

            // ИГРАТЬ
            RectangleF pr = new RectangleF(56, 300, 300, 72); hits["play"] = pr;
            bool ph = Hover == "play"; float pl = 0.5f + 0.5f * (float)Math.Sin(t * 3.2);
            for (int i = 4; i >= 1; i--)
            {
                RectangleF gr = pr; gr.Inflate(i * 4f, i * 4f);
                using (GraphicsPath gp = Round(gr, 10 + i * 4)) using (SolidBrush b = new SolidBrush(Color.FromArgb((int)((ph ? 34 : 14 + 12 * pl) * (5 - i) / 4), 255, 50, 40))) g.FillPath(b, gp);
            }
            using (GraphicsPath gp = Round(pr, 10))
            {
                using (LinearGradientBrush lg = new LinearGradientBrush(pr, ph ? Color.FromArgb(255, 110, 90) : Color.FromArgb(255, 72, 60), ph ? Color.FromArgb(225, 30, 40) : Color.FromArgb(190, 18, 30), 90f)) g.FillPath(lg, gp);
                using (Pen pen = new Pen(Color.FromArgb(90, 255, 255, 255), 1.2f)) g.DrawPath(pen, gp);
            }
            using (GraphicsPath tri = new GraphicsPath()) { tri.AddPolygon(new PointF[] { new PointF(pr.X + 40, pr.Y + 24), new PointF(pr.X + 40, pr.Y + 48), new PointF(pr.X + 60, pr.Y + 36) }); g.FillPath(Brushes.White, tri); }
            using (Font f = new Font(ru, 32f, GraphicsUnit.Pixel)) Txt(g, "ИГРАТЬ", f, Color.White, pr.X + 78, pr.Y + 17);
            using (Font f = new Font("Segoe UI", 11f, GraphicsUnit.Pixel)) Txt(g, "Enter", f, Color.FromArgb(160, 255, 255, 255), pr.Right - 44, pr.Bottom - 20);

            // настройки
            float y = 398;
            Row(g, "ГРАФИКА", y, new string[] { "Авто", "Низкая", "Средняя", "Высокая" }, IndexQ(), "q");
            Row(g, "ЭКРАН", y + 40, new string[] { "Во весь экран", "В окне" }, set.Full ? 0 : 1, "full");
            Row(g, "СЧЁТЧИК FPS", y + 80, new string[] { "Вкл", "Выкл" }, set.Fps ? 0 : 1, "fps");
            using (Font f = new Font("Segoe UI", 12.5f, GraphicsUnit.Pixel)) using (SolidBrush b = new SolidBrush(DIM))
                g.DrawString(QHINT[set.Q], f, b, new RectangleF(58, y + 122, 520, 36));

            // бегущая строка
            using (SolidBrush b = new SolidBrush(Color.FromArgb(215, 12, 4, 8))) g.FillRectangle(b, 0, 556, LW, 28);
            using (SolidBrush b = new SolidBrush(RED)) g.FillRectangle(b, 0, 556, LW, 2);
            using (Font f = new Font(ru, 13f, GraphicsUnit.Pixel))
            {
                float nw = Wd(g, NEWS, f); if (newsX < -nw) newsX += nw;
                g.SetClip(new RectangleF(0, 558, LW, 26));
                for (float x = newsX; x < LW; x += nw) Txt(g, NEWS, f, GOLD, x, 564);
                g.ResetClip();
            }

            // нижняя полоса
            using (SolidBrush b = new SolidBrush(Color.FromArgb(235, 6, 6, 10))) g.FillRectangle(b, 0, 584, LW, LH - 584);
            using (Font f = new Font("Segoe UI", 12f, GraphicsUnit.Pixel))
            {
                Txt(g, "версия " + App.Version + " · фанатский проект · Edge откроет игру в отдельном окне", f, Color.FromArgb(110, 120, 140), 18, 596);
                float x = LW - 18;
                foreach (string[] l in new string[][] { new string[] { "uninst", "Удалить игру" }, new string[] { "folder", "Папка игры" }, new string[] { "gh", "GitHub" } })
                {
                    float w = Wd(g, l[1], f); x -= w; RectangleF r = new RectangleF(x - 4, 590, w + 8, 24); hits[l[0]] = r;
                    Txt(g, l[1], f, Hover == l[0] ? Color.White : DIM, x, 596);
                    if (Hover == l[0]) using (Pen pen = new Pen(RED, 1.5f)) g.DrawLine(pen, x, 612, x + w, 612);
                    x -= 22;
                }
            }
            using (Pen pen = new Pen(Color.FromArgb(70, 255, 70, 60), 1f)) g.DrawRectangle(pen, 0, 0, LW - 1, LH - 1);
        }

        void TopBtn(Graphics g, string id, RectangleF r, bool close)
        {
            hits[id] = r;
            if (Hover == id) using (SolidBrush b = new SolidBrush(close ? Color.FromArgb(232, 17, 35) : Color.FromArgb(50, 255, 255, 255))) g.FillRectangle(b, r);
            using (Pen p = new Pen(Color.FromArgb(220, 255, 255, 255), 1.3f))
            {
                float cx = r.X + r.Width / 2, cy = r.Y + r.Height / 2;
                if (close) { g.DrawLine(p, cx - 5, cy - 5, cx + 5, cy + 5); g.DrawLine(p, cx + 5, cy - 5, cx - 5, cy + 5); }
                else g.DrawLine(p, cx - 5, cy, cx + 5, cy);
            }
        }

        int IndexQ() { for (int i = 0; i < QUAL.Length; i++) if (QUAL[i][0] == set.Q) return i; return 0; }

        void Row(Graphics g, string label, float y, string[] opts, int sel, string id)
        {
            using (Font f = new Font(ru, 12f, GraphicsUnit.Pixel)) Txt(g, label, f, DIM, 58, y + 8);
            float x = 182;
            using (Font f = new Font("Segoe UI Semibold", 13f, GraphicsUnit.Pixel))
                for (int i = 0; i < opts.Length; i++)
                {
                    float w = Wd(g, opts[i], f) + 26; RectangleF r = new RectangleF(x, y, w, 30); string hid = id + ":" + i; hits[hid] = r;
                    bool on = i == sel, hv = Hover == hid;
                    using (GraphicsPath gp = Round(r, 6))
                    {
                        using (SolidBrush b = new SolidBrush(on ? RED : hv ? Color.FromArgb(215, 34, 39, 54) : PANEL)) g.FillPath(b, gp);
                        using (Pen p = new Pen(on ? Color.FromArgb(255, 120, 110) : hv ? Color.FromArgb(140, 150, 170) : LINE, 1f)) g.DrawPath(p, gp);
                    }
                    Txt(g, opts[i], f, on ? Color.White : TXT, x + 13, y + 7);
                    x += w + 8;
                }
        }

        // ---------- мышь ----------
        string Hit(Point p)
        {
            PointF q = new PointF(p.X / S, p.Y / S);
            foreach (KeyValuePair<string, RectangleF> h in hits) if (h.Value.Contains(q)) return h.Key;
            return null;
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e); string h = Hit(e.Location);
            if (h != Hover) { Hover = h; Cursor = h != null ? Cursors.Hand : Cursors.Default; Invalidate(); }
        }

        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); Hover = null; Invalidate(); }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button != MouseButtons.Left) return;
            string h = Hit(e.Location);
            if (h == null) { if (e.Y / S < 40 || e.X / S > 400) { ReleaseCapture(); SendMessage(Handle, 0xA1, (IntPtr)2, IntPtr.Zero); } return; }   // таскаем окно за пустые места
            if (h == "close") Close();
            else if (h == "min") WindowState = FormWindowState.Minimized;
            else if (h == "play") Play();
            else if (h.StartsWith("q:")) { set.Q = QUAL[int.Parse(h.Substring(2))][0]; set.Save(); }
            else if (h.StartsWith("full:")) { set.Full = h == "full:0"; set.Save(); }
            else if (h.StartsWith("fps:")) { set.Fps = h == "fps:0"; set.Save(); }
            else if (h == "gh") Open("https://github.com/jelos8vetoi/god-of-grimerka");
            else if (h == "folder") Open(Game.Dir);
            else if (h == "uninst") { if (Uninstall.Run(new string[] { "/uninstall" }) == 0 && !File.Exists(Path.Combine(Game.Dir, App.Marker))) Close(); }
            Invalidate();
        }

        static void Open(string what) { try { ProcessStartInfo p = new ProcessStartInfo(what); p.UseShellExecute = true; Process.Start(p); } catch { } }

        void Play() { set.Save(); if (Game.Start(set)) Close(); }

        public void Shot(string file)
        {
            Step(0.5f);
            using (Bitmap b = new Bitmap(ClientSize.Width, ClientSize.Height)) { DrawToBitmap(b, new Rectangle(0, 0, b.Width, b.Height)); b.Save(file, System.Drawing.Imaging.ImageFormat.Png); }
        }
    }
}
