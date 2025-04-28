Feature: CreateQuickQuote

A short summary of the feature

@tag1
Scenario: Creating a new Quick quote
	Given Login into the Portal
	When Navigate to the Dashboard
	And Click on the Create Quick Quote button
	And Navigate to the Quick Comparision screen'
	And Enter the data in all required field
	And click on the Calculate button
	Then Quick Quote is generated
	Then click on the Create Quote Button
	Then Navigate to the Standard Quick Quote



	