# Build locally
build:
	@bundle exec jekyll build;

# Serve locally
serve:
	@bundle exec jekyll serve;

# Copy the outputs of a split_model_results run into data/. Usage:
#   make sync SRC="../respond-map-prep/archive/split_model_results/<packet id>/artefacts"
# District files are the capitalised *.js files; national.js and the two table HTML files
# per district are copied alongside, plus the library folder shared by the tables.
sync:
	@test -n "$(SRC)" || { echo 'usage: make sync SRC=<artefacts folder>'; exit 1; }
	@rm -rf data/*.js data/*.html data/reactable_lib
	@cp "$(SRC)"/national.js "$(SRC)"/[A-Z]*.js data/
	@cp "$(SRC)"/*_tas.html "$(SRC)"/*_facilities.html data/
	@cp -r "$(SRC)"/reactable_lib data/
	@echo "Synced $$(ls data/[A-Z]*.js | wc -l) district files from $(SRC)"

# Convenience target to print all of the available targets in this file
# From https://stackoverflow.com/questions/4219255
.PHONY: list
list:
	@LC_ALL=C $(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | \
		awk -v RS= -F: '/^# File/,/^# Finished Make data base/ \
		{if ($$1 !~ "^[#.]") {print $$1}}' | \
		sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$'
