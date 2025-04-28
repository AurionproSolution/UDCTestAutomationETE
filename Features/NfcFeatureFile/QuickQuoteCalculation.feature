Feature: QuickQuoteCalculation

A short summary of the feature

@Regression
Scenario: User creates a Quick Quote and validates calculation
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	#Then the user enters the "Down Payment"
	#And the user enters the "Balloon"
	And enters all required fields
	And clicks on the calculate button
	Then validate the calculated values

	When the Quick Quote button is enabled
	And the user clicks on the Quick Quote button
	Then the user should be redirected to the Standard Quote page
	And validate the program, product, month terms, and frequency values
