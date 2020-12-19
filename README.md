# Introduction 
TODO: Give a short introduction of your project. Let this section explain the objectives or the motivation behind this project. 

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

=> "node --max-old-space-size=2048 node_modules/@angular/cli/bin/ng build --prod --outputHashing=all && firebase deploy -P default"

2.  Installation process
3.	Software dependencies
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
1.1.0 | 2020-12-16 | Display sub-entries in schedule (ordered by time) unoptimized + create/update goals with expectedTiemsOfCompletion + check if doc exists before write
1.2.0 | 2020-12-16 | Highlight most close time in schedule view + session persists and login components hide automatically
1.2.1 | 2020-12-16 | Hide all display options (category-view, completed sub-entries, hide units and details) with a checkbox
1.3.0 | 2020-12-17 | display top chart in mobile size + hide it conditionally + new/modify goals via UI again + fill modify automatically when name selected + success and fail message on UI for a few seconds (not relying on console.log)
2.0.0 | 2020-12-18 | Nonprod access (ng serve) test_* collections in Firestore db VS 'ng build --prod' access the regular collections
2.0.1 | 2020-12-18 | Display environment on UI
2.1.0 | 2020-12-18 | Fixed error logic with toggling checkboxes on top and optimized (less deep-copy, less processing on the fly) + dates on charts only shows dates not year and month
2.1.1 | 2020-12-18 | Adding dates to version history in readme 
2.2.0 | 2020-12-18 | Data table has fixed width and invisible scrollbar (width dynamically changed based on chart visibility)

# Contribute
TODO: Explain how other users and developers can contribute to make your code better. 

If you want to learn more about creating good readme files then refer the following [guidelines](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-a-readme?view=azure-devops). You can also seek inspiration from the below readme files:
- [ASP.NET Core](https://github.com/aspnet/Home)
- [Visual Studio Code](https://github.com/Microsoft/vscode)
- [Chakra Core](https://github.com/Microsoft/ChakraCore)
