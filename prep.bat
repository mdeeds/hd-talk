@echo off
setlocal

del all-js.txt

for %%a in (*.js) do (
    echo Processing file: %%a
    (
	echo.
	echo ==== %%a ====
        type "%%a"
	echo.
    ) >> all-js.txt
)

endlocal

notepad all-js.txt