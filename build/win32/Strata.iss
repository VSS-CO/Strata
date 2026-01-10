; Strata Extended Language Installer
; Modern scripting language with static typing and C code generation
; Based on Inno Setup

#define MyAppName "Strata Extended"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Strata Project"
#define MyAppURL "https://github.com/VSS-CO/Strata"
#define MyAppExeName "strata.exe"
#define MyAppAssocName "Strata Source File"
#define MyAppAssocExt ".str"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
AppId={{A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Strata
DefaultGroupName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} {#MyAppVersion}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
ChangesAssociations=yes
ChangesEnvironment=yes
DisableProgramGroupPage=no
LicenseFile=G:\Strata\LICENSE
OutputDir=G:\Strata\build\win32\Output
OutputBaseFilename=StrataExtended-1.0.0-Setup
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
SolidCompression=yes
WizardStyle=modern
Compression=lzma2
CompressionThreads=auto
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked
Name: "addtopath"; Description: "Add Strata to system PATH"; GroupDescription: "System settings:"; Flags: checkedonce
Name: "createexamples"; Description: "Create example programs in user directory"; GroupDescription: "Extras:"; Flags: unchecked

[Files]
; Main executable
Source: "G:\Strata\build\win32\strata.exe"; DestDir: "{app}"; DestName: "strata.exe"; Flags: ignoreversion; Components: main

; Runtime files
Source: "G:\Strata\dist\index.js"; DestDir: "{app}"; Flags: ignoreversion; Components: main
Source: "G:\Strata\package.json"; DestDir: "{app}"; Flags: ignoreversion; Components: main

; Documentation
Source: "G:\Strata\README.md"; DestDir: "{app}\docs"; Components: docs
Source: "G:\Strata\ARCHITECTURE.md"; DestDir: "{app}\docs"; Components: docs
Source: "G:\Strata\AGENTS.md"; DestDir: "{app}\docs"; Components: docs

; Examples
Source: "G:\Strata\examples\01_basic_types.str"; DestDir: "{app}\examples"; Components: examples
Source: "G:\Strata\examples\02_arithmetic.str"; DestDir: "{app}\examples"; Components: examples
Source: "G:\Strata\examples\03_comparison.str"; DestDir: "{app}\examples"; Components: examples
Source: "G:\Strata\examples\10_functions.str"; DestDir: "{app}\examples"; Components: examples

; SDK files (optional)
Source: "G:\Strata\sdk\dist\*"; DestDir: "{app}\sdk"; Flags: ignoreversion recursesubdirs; Components: sdk

[Components]
Name: "main"; Description: "Strata Extended Compiler and Runtime"; Types: full compact custom; Flags: fixed
Name: "docs"; Description: "Documentation and Guides"; Types: full
Name: "examples"; Description: "Example Programs"; Types: full
Name: "sdk"; Description: "Strata SDK (IDE, CLI tools, and development libraries)"; Types: full

[Registry]
; File association
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocExt}\OpenWithProgids"; ValueType: string; ValueName: "{#MyAppAssocKey}"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocKey}"; ValueType: string; ValueName: ""; ValueData: "{#MyAppAssocName}"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocKey}\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocKey}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""

; Add to PATH (optional)
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; Tasks: addtopath; Check: NeedsAddPath

; Uninstall registry entry
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "DisplayName"; ValueData: "{#MyAppName} {#MyAppVersion}"
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "DisplayVersion"; ValueData: "{#MyAppVersion}"
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "UninstallString"; ValueData: "{uninstallexe}"
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "URLInfoAbout"; ValueData: "{#MyAppURL}"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Comment: "Strata Extended Programming Language"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; Comment: "Strata Extended Programming Language"
Name: "{autoprograms}\{#MyAppName}\Uninstall"; Filename: "{uninstallexe}"; Comment: "Uninstall Strata Extended"
Name: "{autoprograms}\{#MyAppName}\Documentation"; Filename: "{app}\docs\README.md"; Comment: "View Documentation"
Name: "{autoprograms}\{#MyAppName}\Examples"; Filename: "{app}\examples"; Comment: "Browse Example Programs"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Run Strata Extended"; Flags: nowait postinstall skipifsilent; Tasks: ""

[InstallDelete]
Type: dirifempty; Name: "{app}\examples"
Type: dirifempty; Name: "{app}\docs"
Type: dirifempty; Name: "{app}"

[UninstallDelete]
Type: dirifempty; Name: "{app}\examples"
Type: dirifempty; Name: "{app}\docs"

[Code]
function NeedsAddPath(): Boolean;
var
  Path: string;
begin
  if RegQueryStringValue(HKCU, 'Environment', 'Path', Path) then
    Result := Pos(ExpandConstant('{app}'), Path) = 0
  else
    Result := True;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if not IsWindows10OrGreater() then
  begin
    MsgBox('Warning: Windows 10 or later is recommended for Strata Extended.', mbInformation, MB_OK);
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
  if MsgBox('Are you sure you want to uninstall ' + '{#MyAppName}' + '?', mbConfirmation, MB_YESNO) = IDNO then
    Result := False;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  case CurStep of
    ssPostInstall:
      begin
        MsgBox('Strata Extended has been installed successfully.' + #13#13 + 
               'To get started:' + #13 +
               '1. Create a file with .str extension' + #13 +
               '2. Write your Strata code' + #13 +
               '3. Run: strata program.str' + #13 +
               'For examples, see the examples folder.', mbInformation, MB_OK);
      end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  case CurUninstallStep of
    usUninstall:
      begin
        RemovePathEntry(ExpandConstant('{app}'));
      end;
  end;
end;

procedure RemovePathEntry(const Path: string);
var
  EnvPath: string;
begin
  if RegQueryStringValue(HKCU, 'Environment', 'Path', EnvPath) then
  begin
    EnvPath := StringReplace(EnvPath, Path + ';', '', False, True, True);
    EnvPath := StringReplace(EnvPath, ';' + Path, '', False, True, True);
    EnvPath := StringReplace(EnvPath, Path, '', False, True, True);
    RegWriteStringValue(HKCU, 'Environment', 'Path', EnvPath);
  end;
end;
