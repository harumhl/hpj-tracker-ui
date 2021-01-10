# Introduction 
A habit tracker (a type of "to-do list") that can display entries by categories or by time (aka expected times of completion).
It displays a chart of completion rates over the past few days and notes on top to encourage users to keep up with their tasks. 

# Getting Started
TODO: Guide users through getting your code up and running on their own system. In this section you can talk about:

1.  My initial setup process

I followed Firebase's documentation to set up Realtime Database and to deploy to their Hosting server. In the future, 
all I need is 'npm run-script build' and 'firebase deploy'.

Starting 1.3.0, npm wasn't able to create a build due to memory issue. Running 'node --max-old-space-size=2048 node_modules/@angular/cli/bin/ng build'
instead of 'npm run-script build' worked.

Adding --outputHashing=all flag makes the browser to retrieve the newer website instead of cached one after "firebase
 deploy".

"firebase use --add" adds a new environment. Now my current setup has 'default' and 'staging'.

With a new feature of displaying 7 days' completion rates by reading in the data and computing, daily read quota was met
 during development and it had to be put on a pause. Here's to check the quotas: https://console.cloud.google.com/appengine/quotadetails

After closing out, you may need to "firebase login" again (maybe after "firebase logout"), or even "firebase login --no-localhost"

v2.8.2 started adding a build timestamp on the bottom next to the version and running "node ./timestamp.js" is
 required to generate the build timestamp in environment.ts.

=> "node ./timestamp.js && node --max-old-space-size=2048 node_modules/@angular/cli/bin/ng build --prod --outputHashing=all && firebase deploy -P default && rmdir public /s /q"

2.  Installation process (npm install)
3.	Software dependencies (Firestore)
4.	Latest releases
5.	API references

# Build and Test
TODO: Describe and show how to build your code and run the tests. 

# History
Version | Date | Details
--- | --- | ---
0.0.0 | 2020-12-10 | copying from Azure repo, using Azure server and db
0.1.0 | 2020-12-12 | Login + Display data in table
0.2.0 | 2020-12-13 | Overall % + new empty entry of the day + display data by default + fn to enter new category/goal/entry
0.3.0 | 2020-12-13 | Modify entry once logged in
0.3.1 | 2020-12-13 | Complete and incomplete tasks align / login button not hidden if login failed
0.3.2 | 2020-12-13 | Display categories & temporary solution to display most of daily entries on the phone without requiring much scroll
0.3.3 | 2020-12-13 | Toggle to display incomplete tasks only + background color on overall % + overall % logic fix + empty input means 0 
0.4.0 | 2020-12-13 | Enter new goal or update existing goal via UI + README has version history + db .validate rules are intact + goals accept 'details' + category gets colors + model is back + display categories and goals for testing
0.5.0 | 2020-12-15 | Display today's date and day + full display to show details + daily entries only from unarchived goals
0.5.1 | 2020-12-15 | new/modify goals on UI not displayed until 'testing' clicked + docstring for functions + callback parameters have types specified + default values if optional
1.0.0 | 2020-12-16 | Migrating from Firebase Realtime Database to Firebase Cloud Firestore as it provides more functionalities
1.0.1 | 2020-12-16 | A day's subentries will be added with a new goal even though new entry already exists
1.1.0 | 2020-12-16 | Display sub-entries in schedule (ordered by time) unoptimized + create/update goals with expectedTimesOfCompletion + check if doc exists before write
1.2.0 | 2020-12-16 | Highlight most close time in schedule view + session persists and login components hide automatically
1.2.1 | 2020-12-16 | Hide all display options (category-view, completed sub-entries, hide units and details) with a checkbox
1.3.0 | 2020-12-17 | display top chart in mobile size + hide it conditionally + new/modify goals via UI again + fill modify automatically when name selected + success and fail message on UI for a few seconds (not relying on console.log)
2.0.0 | 2020-12-18 | Nonprod access (ng serve) test_* collections in Firestore db VS 'ng build --prod' access the regular collections
2.0.1 | 2020-12-18 | Display environment on UI
2.1.0 | 2020-12-18 | Fixed error logic with toggling checkboxes on top and optimized (less deep-copy, less processing on the fly) + dates on charts only shows dates not year and month
2.1.1 | 2020-12-18 | Adding dates to version history in readme 
2.2.0 | 2020-12-18 | Data table has fixed width and invisible scrollbar (width dynamically changed based on chart visibility)
2.2.1 | 2020-12-19 | Adding today's date to the top chart (on top of past 7 days) + minor code quality (e.g. typos, missing semi-colons)
2.2.2 | 2020-12-20 | Chart reloads as more tasks/sub-entries are completed throughout the day - without refreshing the page
2.2.3 | 2020-12-21 | Modify Goal validates expectedTimesOfCompletion + regex for New/Modify Goal is fixed and now requires leading zero
2.2.4 | 2020-12-22 | Display active/archived goal count & color archived + Allow float entry
2.2.5 | 2020-12-22 | Fixing errors of checking 'length' of undefined (by setting the variable with an empty array)
2.3.0 | 2020-12-22 | If a sub-entry is partially done, then do not show it in the early schedules (based on the percentage done and the number of showings in schedule aka expectedTimesOfCompletion.length)
2.3.1 | 2020-12-24 | Display overall completion rates of the past 7 days in console.log as well (not just chart)
2.4.0 | 2020-12-25 | Added a link to my Firestore db + Display notes on top
2.4.1 | 2020-12-25 | Clicking (or tapping) the chart and notes hides them (respectively)
2.4.2 | 2020-12-28 | Tab and new line characters in note texts are applied in HTML when displayed
2.4.3 | 2020-12-28 | Double tap to hide chart and notes instead of single tap. Replaces all tabs and new line chars in note texts
2.4.4 | 2020-12-28 | Notes do not wrap while keeping \n and \t + collapsible bar for notes chart testing 
2.5.0 | 2020-12-28 | Adding missed html components for v2.4.4 + A new component named 'subentry-table' to display table consistently across + display entries of past 7 days
2.5.1 | 2020-12-28 | Fixed color display on subentry-table component
2.6.0 | 2020-12-29 | Reading data only after login + moving templates to UtilService + Safari respects tab and new line chars without wrapping
2.6.1 | 2020-12-29 | Auto-login again with session + entries of past 7 days under Testing update the Firestore db correctly
2.7.0 | 2020-12-30 | Highlights specific phrases in notes
2.7.1 | 2020-12-30 | Display 'category' column only on desktop by default
2.8.0 | 2020-12-30 | Old table css is correctly applied to subentry-table + the web can act as a standalone app on iPhone without using Safari UI (PWA installation)
2.8.1 | 2020-12-30 | Patching on PWA installation (removed unused component) + double tapping any part of Testing will hide it
2.8.2 | 2020-12-30 | Generate build timestamp
3.0.0 | 2021-01-02 | goals in Testing is sorted by category and shows with category color + the primary key (aka documentId) for 'goals' is now category_name instead of just goal name + new/modify goal dropdown gets at-0 item as default
3.0.1 | 2021-01-02 | documentId in document itself is consistent with the actual documentId (no spaces)
3.0.2 | 2021-01-02 | Focus out on input box puts 0 back + more category colors + reorganized subentry-table background colors and goal name also displays colors
3.0.3 | 2021-01-02 | category color on top of completion rate colors
3.0.4 | 2021-01-04 | the chart is redrawn/refreshed/reloaded upon successful update on a subentry
3.1.0 | 2021-01-08 | subscribe to Goals + entering -1 hides the subentry until 'incomplete & unhidden only' is turned off and the subentry is given an update
3.1.1 | 2021-01-10 | timeToHighlight is updated every 5 mins + no static fn in UtilService

# Contribute
TODO: Explain how other users and developers can contribute to make your code better. 

If you want to learn more about creating good readme files then refer the following [guidelines](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-a-readme?view=azure-devops). You can also seek inspiration from the below readme files:
- [ASP.NET Core](https://github.com/aspnet/Home)
- [Visual Studio Code](https://github.com/Microsoft/vscode)
- [Chakra Core](https://github.com/Microsoft/ChakraCore)
