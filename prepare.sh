echo $1
if [ -z "$(git status --porcelain)" ]; then
    npm run compile &&
    git add dist &&
    git commit -m "updated binaries" &&
    git branch --show-current | 
    xargs -i git push -u origin {} &&
    npm version $1;
    exit 0
else
    echo "Dirty working directory; commit or stash your uncommited changes.";
    exit -1
fi