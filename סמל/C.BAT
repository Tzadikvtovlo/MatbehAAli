@echo off
chcp 65001 > nul
set "input="
set /p "input=גרור לכאן את קובץ ה-PNG שלך ולחץ Enter: "

REM הסרת מרכאות כפולות אם קיימות בתחילת או בסוף הנתיב
set "input=%input:"=%"

if not exist "%input%" (
    echo.
    echo השגיאה: הקובץ לא נמצא בנתיב שהוזן!
    echo נתיב שנבדק: %input%
    echo.
    pause
    exit /b
)

echo.
echo מעבד את הגדלים...

C:\ffmpeg.exe -i "%input%" -vf "scale=16:16:flags=lanczos" -y icon16.png
C:\ffmpeg.exe -i "%input%" -vf "scale=48:48:flags=lanczos" -y icon48.png
C:\ffmpeg.exe -i "%input%" -vf "scale=128:128:flags=lanczos" -y icon128.png

echo.
echo הסתיים בהצלחה! נוצרו הקבצים באותה התיקייה:
echo - icon16.png
echo - icon48.png
echo - icon128.png
pause